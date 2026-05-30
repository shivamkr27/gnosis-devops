# Gnosis DevOps — Production Infrastructure

Gnosis is a gamified learning platform for BTech students, deployed on AWS EKS with a complete DevSecOps pipeline.

## Architecture

```
Developer Push → GitHub Actions CI
                      ↓
              SonarQube SAST + OWASP + Checkov
                      ↓
              Docker Build + Trivy Scan
                      ↓
              Push to AWS ECR
                      ↓
              Update GitOps Manifests
                      ↓
              ArgoCD Auto-Sync → EKS
                      ↓
              Prometheus + Grafana + Alertmanager
                      ↓
              Kira AIOps (Gemini Flash)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Application | Node.js, React, Socket.io, PostgreSQL, Redis |
| Containers | Docker, AWS ECR |
| Orchestration | Kubernetes (EKS), Helm, ArgoCD |
| Infrastructure | Terraform (VPC, EKS, ECR) |
| CI/CD | GitHub Actions |
| Security | Trivy, SonarQube, OWASP, Checkov, Falco, Network Policies |
| Observability | Prometheus, Grafana, Alertmanager, Loki |
| AIOps | Kira (Gemini Flash) |

## Microservices

| Service | Port | Responsibility |
|---------|------|---------------|
| api-gateway | 3000 | JWT auth, routing |
| auth-service | 3001 | Login, register, friends |
| content-service | 3002 | Subjects, levels, Gemini AI questions |
| progress-service | 3003 | XP, level unlock, streaks |
| xp-service | 3004 | Leaderboard, XP ledger |
| battle-service | 3005 | Real-time 1v1 + group quiz |
| notification-service | 3006 | Online presence, alerts |

## Quick Start

### 1. Infrastructure
```bash
cd infrastructure
terraform init
terraform plan
terraform apply
aws eks update-kubeconfig --region ap-south-1 --name gnosis-cluster
```

### 2. Deploy Gnosis
```bash
kubectl apply -f gitops/k8s/namespace.yaml
kubectl apply -f gitops/k8s/secrets.yaml      # Fill real values first
kubectl apply -f gitops/k8s/configmap.yaml
kubectl apply -f gitops/k8s/
kubectl apply -f gitops/argocd-app.yaml
```

### 3. Monitoring
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  -f monitoring/prometheus-values.yaml
```

### 4. Kira AIOps
```bash
cd aiops
pip install -r requirements.txt
export GEMINI_API_KEY=your_key
export PROMETHEUS_URL=http://prometheus-url:9090
streamlit run kira.py
```

## Cost Estimate

| Resource | Cost |
|----------|------|
| EKS Control Plane | $0.10/hr |
| 2x t3.medium nodes | $0.084/hr |
| NAT Gateway | $0.045/hr |
| **Total** | **~$0.23/hr (~$5.50/day)** |

> Tip: Run `terraform destroy` when not showcasing. `terraform apply` brings it back in 15 minutes.
