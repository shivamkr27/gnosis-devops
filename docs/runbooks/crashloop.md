# Runbook: Pod CrashLoopBackOff

**Alert:** `GnosisPodCrashLooping` — pod restarted >3 times in 5 minutes.

## Diagnosis

```bash
# Identify which pod is crashing
kubectl get pods -n gnosis

# Check current logs
kubectl logs <pod-name> -n gnosis --tail=100

# Check previous crash logs (critical — pod may have already restarted)
kubectl logs <pod-name> -n gnosis --previous --tail=200

# Describe pod for OOMKilled / liveness probe failures / image pull errors
kubectl describe pod <pod-name> -n gnosis
```

## Common Causes and Fixes

### 1. OOMKilled (Exit 137)
`kubectl describe pod` shows `OOMKilled: true` or `Exit Code: 137`.

**Fix:** Increase memory limit in the deployment:
```bash
kubectl set resources deployment/<service> -n gnosis --limits=memory=1Gi
```
Or update `gitops/k8s/<service>/deployment.yaml` and let ArgoCD sync.

### 2. Missing Secret / ConfigMap key
Logs show `Error: ENOENT` or `Cannot read env var` on startup.

**Fix:** Verify the secret exists:
```bash
kubectl get secret gnosis-secrets -n gnosis -o jsonpath='{.data}' | base64 -d
```
Re-create if missing — see [secrets setup in README](../../README.md).

### 3. DB Connection Refused
Logs show `ECONNREFUSED postgres:5432` or `getaddrinfo ENOTFOUND`.

**Fix:** Check postgres pod is running and healthy:
```bash
kubectl get pods -n gnosis -l app=postgres
kubectl exec -it postgres-0 -n gnosis -- pg_isready -U postgres
```
See [db-connection-exhaustion runbook](./db-connection-exhaustion.md).

### 4. Liveness Probe Killing Healthy Pod (slow startup)
Pod restarts repeatedly but logs show the service started successfully.

**Fix:** Increase `initialDelaySeconds` or add a `startupProbe`.

### 5. readOnlyRootFilesystem write error
Logs show `EROFS: read-only file system` for a path other than `/tmp`.

**Fix:** Add an emptyDir volume mount for that path in the deployment YAML.

## Rollback

```bash
# Roll back to previous image
kubectl rollout undo deployment/<service> -n gnosis

# Verify rollback
kubectl rollout status deployment/<service> -n gnosis
```
