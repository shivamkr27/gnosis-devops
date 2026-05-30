# CLAUDE.md — Gnosis DevOps Safe Execution Guide

This file configures Claude Code for safe operation on the Gnosis production cluster.

## Rules

1. ALWAYS explain what a command does before running it
2. NEVER run `terraform destroy` without explicit typed confirmation: "yes destroy"
3. NEVER expose secrets, JWT tokens, or API keys in output
4. NEVER run kubectl delete without showing what will be deleted first
5. For any destructive operation, show a dry-run first

## MCP Servers

### 1. kubectl-safe
Safe Kubernetes operations — read-only by default.
Allowed: get, describe, logs, top, exec (with confirmation)
Blocked: delete (requires confirmation), apply (show diff first)

### 2. terraform-controlled  
Terraform operations with guardrails.
Always run `terraform plan` before `terraform apply`.
`terraform destroy` requires typed confirmation.

### 3. aws-readonly
AWS CLI read operations for cost and resource monitoring.
Allowed: describe, list, get
Blocked: create, delete, modify (except via Terraform)

### 4. gnosis-orchestrator
High-level Gnosis deployment orchestration.
Commands: deploy-service, rollback-service, check-health, view-logs

## Common Commands

```bash
# Check cluster health
kubectl get pods -n gnosis

# View service logs
kubectl logs -f deployment/battle-service -n gnosis

# Deploy new version (via ArgoCD — preferred)
# Push to main branch → GitHub Actions builds → ArgoCD syncs automatically

# Manual rollback
kubectl rollout undo deployment/battle-service -n gnosis

# Check ArgoCD sync status
argocd app get gnosis
```
