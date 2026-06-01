# Gnosis — Wapas Start Karo
# Run this when A1.Flex node is Active and you want to go live again
# Usage: .\scripts\restart-gnosis.ps1

Write-Host "Checking node status..." -ForegroundColor Cyan
kubectl get nodes

Write-Host "`nRestoring LoadBalancers..." -ForegroundColor Cyan
$lb = '{"spec":{"type":"LoadBalancer"}}'
$lb | Out-File "$env:TEMP\lb.json" -Encoding ASCII
kubectl patch svc frontend   -n gnosis --type=merge --patch-file="$env:TEMP\lb.json"
kubectl patch svc api-gateway -n gnosis --type=merge --patch-file="$env:TEMP\lb.json"

Write-Host "`nRestarting all services..." -ForegroundColor Cyan
kubectl rollout restart deployment -n gnosis

Write-Host "`nWaiting for pods..." -ForegroundColor Cyan
kubectl wait --for=condition=ready pod -l app=frontend -n gnosis --timeout=120s
kubectl wait --for=condition=ready pod -l app=api-gateway -n gnosis --timeout=120s

Write-Host "`nLive URLs:" -ForegroundColor Green
kubectl get svc frontend api-gateway -n gnosis
