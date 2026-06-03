# Runbook: PostgreSQL Connection Exhaustion

**Alert:** `GnosisPostgresConnectionsHigh` — active connections >80 out of 100.

## Diagnosis

```bash
# Connect to postgres and check connections
kubectl exec -it postgres-0 -n gnosis -- psql -U postgres -c "
  SELECT state, count(*) 
  FROM pg_stat_activity 
  GROUP BY state;"

# See which services are holding connections
kubectl exec -it postgres-0 -n gnosis -- psql -U postgres -c "
  SELECT application_name, state, count(*), now() - min(state_change) AS oldest
  FROM pg_stat_activity 
  WHERE datname = 'gnosis'
  GROUP BY application_name, state
  ORDER BY count DESC;"

# Check for long-running / idle-in-transaction queries
kubectl exec -it postgres-0 -n gnosis -- psql -U postgres -c "
  SELECT pid, now() - state_change AS duration, state, query
  FROM pg_stat_activity
  WHERE state != 'idle' AND datname = 'gnosis'
  ORDER BY duration DESC LIMIT 20;"
```

## Common Causes and Fixes

### 1. Connection Pool Leak — Service Not Releasing Connections
A service crashed mid-transaction and left connections open.

**Fix:** Terminate idle connections and restart the offending service:
```bash
# Terminate idle connections from a specific service
kubectl exec -it postgres-0 -n gnosis -- psql -U postgres -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'gnosis' AND state = 'idle'
  AND application_name = '<service-name>';"

# Restart the service
kubectl rollout restart deployment/<service> -n gnosis
```

### 2. HPA Scaled Up Too Many Pods
More replicas = more connection pool instances = more connections.

**Fix:** Each service uses a pool. Reduce pool size per pod via env var if you hit limits, or increase `max_connections` in postgres:
```bash
kubectl exec -it postgres-0 -n gnosis -- psql -U postgres -c "ALTER SYSTEM SET max_connections = 200;"
# Requires postgres restart — schedule maintenance window
```

### 3. init_db.sql Running on Every Restart
If postgres pod restarted and the `/docker-entrypoint-initdb.d` runs again, it could hold schema locks.

**Check:**
```bash
kubectl logs postgres-0 -n gnosis | grep "init"
```
This is a known architectural limitation — see `infrastructure/` for migration tool upgrade path.

## Prevention

- Monitor `pg_stat_activity` regularly via Prometheus/Grafana — the `GnosisPostgresConnectionsHigh` alert fires at 80%.
- Consider `pgbouncer` as a connection pooler in front of postgres for future scale.
- Long-term: migrate schema management from `init_db.sql` ConfigMap to `node-pg-migrate` or Flyway for zero-downtime schema changes.
