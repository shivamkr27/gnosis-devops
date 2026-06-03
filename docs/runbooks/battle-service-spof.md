# Runbook: Battle Service — Single Pod / Active Game Disconnect

**Alert:** `GnosisPodNotReady` or `GnosisBattleSocketErrors` on battle-service.

## The Problem

Battle rooms (Socket.io) are in-memory on a single battle-service pod. If that pod crashes or is rescheduled:
- All active WebSocket connections disconnect instantly.
- In-flight battles are lost — no state recovery.
- HPA can scale to multiple pods, but new pods don't know about rooms on the old pod.

## Immediate Recovery

```bash
# Check battle-service status
kubectl get pods -n gnosis -l app=battle-service

# Check logs for the error cause
kubectl logs -l app=battle-service -n gnosis --tail=200

# If pod is stuck Terminating, force delete
kubectl delete pod <pod-name> -n gnosis --grace-period=0

# Verify new pod is healthy
kubectl rollout status deployment/battle-service -n gnosis
```

Players will need to refresh and start a new battle. There is no in-flight battle recovery at this time.

## Long-Term Fix: Redis Adapter

To allow multiple battle-service replicas to share Socket.io rooms, add the Redis adapter:

```bash
# In gnosis/battle-service/
npm install @socket.io/redis-adapter ioredis
```

In the battle-service Socket.io init:
```js
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('ioredis');

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

Once this is in place:
1. Increase battle-service HPA `minReplicas` to 2.
2. Add a `PodDisruptionBudget` to ensure at least 1 replica is always available during node drain.

```yaml
# gitops/k8s/battle-service/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: battle-service-pdb
  namespace: gnosis
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: battle-service
```

## Notification Service Note

`notification-service` also uses Socket.io independently. If both services need real-time scaling, consider consolidating via a shared Redis pub/sub channel, or apply the same Redis adapter pattern.
