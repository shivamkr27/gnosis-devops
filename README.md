# Gnosis — Gamified Learning Platform with Full DevSecOps Pipeline

> A production-grade BTech learning platform deployed on **Oracle Cloud Infrastructure (OCI)** with an end-to-end DevSecOps pipeline including CI/CD, GitOps, container security, Kubernetes orchestration, observability, and AI-powered operations.

---

## Live Demo

| Service | URL |
|---------|-----|
| Gnosis App | http://80.225.228.31 |
| Grafana Dashboards | http://144.24.101.125 (credentials: see grafana-admin-secret in monitoring namespace) |
| API Gateway | http://161.118.178.140:3000 |

---


## What is Gnosis?

Gnosis is a gamified quiz/battle platform for BTech students where they can:
- Study subjects across 25 BTech topics
- Earn XP and unlock levels
- Compete in real-time 1v1 and group quiz battles
- Track rank on a leaderboard

Built with **Node.js microservices**, **React frontend**, **Socket.io** for real-time battles, **PostgreSQL** for persistence, and **Redis** for leaderboard and session management.

---

## Architecture

```
Developer → git push to GitHub
                ↓
        GitHub Actions CI/CD
        ├── SonarQube SAST
        ├── OWASP npm audit
        ├── Checkov IaC scan
        ├── Docker build (multi-arch: amd64 + arm64)
        ├── Trivy image scan
        ├── SBOM generation (Syft)
        ├── Push to OCIR (Oracle Container Registry)
        ├── Cosign image signing
        └── GitOps manifest update (image tags)
                ↓
        ArgoCD (GitOps Operator)
        └── Auto-syncs K8s manifests from GitHub → OKE
                ↓
        OKE Cluster (Oracle Kubernetes Engine)
        ├── 7 Microservices
        ├── PostgreSQL + Redis
        ├── HPA autoscaling
        ├── NetworkPolicy (zero-trust)
        └── OPA Gatekeeper (admission policies)
                ↓
        Observability Stack
        ├── Prometheus (metrics)
        ├── Grafana (dashboards)
        ├── Alertmanager (Slack alerts)
        └── Kira AIOps (Gemini Flash — incident diagnosis)
```

---

## Microservices

| Service | Port | Responsibility |
|---------|------|----------------|
| api-gateway | 3000 | JWT auth, reverse proxy, WebSocket upgrade |
| auth-service | 3001 | Login, register, friends |
| content-service | 3002 | Subjects, levels, Gemini AI questions |
| progress-service | 3003 | XP award, level unlock, streaks |
| xp-service | 3004 | Leaderboard (Redis sorted sets), XP ledger |
| battle-service | 3005 | Real-time 1v1 + group quiz (Socket.io) |
| notification-service | 3006 | Online presence, challenge alerts |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React, Vite, TailwindCSS |
| **Backend** | Node.js, Express, Socket.io |
| **Database** | PostgreSQL 15, Redis 7 |
| **Containers** | Docker (multi-arch: amd64 + arm64) |
| **Registry** | Oracle Container Registry (OCIR) |
| **Orchestration** | Kubernetes (OKE), Helm |
| **GitOps** | ArgoCD |
| **Infrastructure** | Terraform (OCI VCN, OKE) |
| **Provisioning** | Ansible |
| **CI/CD** | GitHub Actions |
| **Security — SAST** | SonarQube |
| **Security — Dependencies** | OWASP npm audit |
| **Security — Containers** | Trivy |
| **Security — IaC** | Checkov |
| **Security — Supply Chain** | Cosign (keyless signing) |
| **Security — Runtime** | OPA Gatekeeper, NetworkPolicy |
| **Observability** | Prometheus, Grafana, Alertmanager |
| **AIOps** | Kira (Google Gemini Flash) |

---

## CI/CD Pipeline — Step by Step

Every `git push` to `main` triggers this pipeline automatically:

### Stage 1 — Security Scans (parallel)
```
SonarQube SAST       → Static code analysis for bugs and vulnerabilities
OWASP npm audit      → Checks all 7 services for known CVEs in dependencies
Checkov IaC scan     → Scans Terraform + K8s manifests for misconfigurations
```

### Stage 2 — Build, Scan, Push (8 services in parallel)
```
1. Docker build      → Multi-arch image (linux/amd64 + linux/arm64)
2. Trivy scan        → Scans image for CRITICAL/HIGH vulnerabilities
3. SBOM generate     → Software Bill of Materials (Syft, SPDX format, 90-day retention)
4. OCIR push         → Pushes to ap-mumbai-1.ocir.io/bmr6dpc3ujz4/gnosis/<service>:<sha>
5. Cosign sign       → Keyless signing via Sigstore/Fulcio for supply chain integrity
```

### Stage 3 — GitOps Update
```
Update manifests     → Replaces image tags in gitops/k8s/*/deployment.yaml with git SHA
Git commit + push    → [skip ci] commit triggers ArgoCD, not another CI run
```

### Stage 4 — Deploy (ArgoCD)
```
ArgoCD detects change → Diffs live cluster vs git manifests
Auto-sync             → Applies only changed resources
Self-heal             → If someone manually changes cluster, ArgoCD reverts it
```

### Stage 5 — Notify
```
Slack webhook        → Sends alert if any stage fails
```

---

## Infrastructure Setup

### Prerequisites
- OCI Account (free tier sufficient)
- Terraform >= 1.5
- OCI CLI configured (`~/.oci/config`)
- kubectl
- Helm

### Step 1 — Provision OCI Infrastructure
```bash
cd infrastructure
cp terraform.tfvars.example terraform.tfvars
# Fill in your OCI credentials
terraform init
terraform plan
terraform apply
```

Creates:
- VCN with public + private subnets
- OKE Kubernetes cluster (public API endpoint)
- Security lists with required ports (80, 443, 6443, 12250)

### Step 2 — Node Pool
After cluster is ready, add a node pool from OCI Console:
- Shape: `VM.Standard.A1.Flex` (Always Free)
- OCPU: 4, Memory: 24GB
- Subnet: gnosis-private-1

### Step 3 — Configure kubectl
```bash
oci ce cluster create-kubeconfig \
  --cluster-id <output from terraform> \
  --region ap-mumbai-1 \
  --token-version 2.0.0 \
  --kube-endpoint PUBLIC_ENDPOINT
```

### Step 4 — Apply K8s Secrets
```bash
kubectl apply -f gitops/k8s/namespace.yaml

kubectl create secret generic gnosis-secrets -n gnosis \
  --from-literal=DB_HOST=postgres \
  --from-literal=DB_PORT=5432 \
  --from-literal=DB_USER=postgres \
  --from-literal=DB_PASSWORD=<your-password> \
  --from-literal=DB_NAME=gnosis \
  --from-literal=JWT_SECRET=<min-32-char-secret> \
  --from-literal=GEMINI_API_KEY=<your-gemini-key> \
  --from-literal=REDIS_URL=redis://redis:6379

kubectl create secret docker-registry ocir-secret \
  --docker-server=ap-mumbai-1.ocir.io \
  --docker-username=<namespace>/<email> \
  --docker-password=<oci-auth-token> \
  -n gnosis

kubectl create configmap gnosis-init-sql \
  --from-file=init.sql=gnosis/init_db.sql \
  -n gnosis
```

### Step 5 — Install ArgoCD
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml --server-side --force-conflicts
kubectl apply -f gitops/argocd-app.yaml
```

ArgoCD will automatically deploy all 7 services, PostgreSQL, and Redis.

### Step 6 — GitHub Actions Secrets
In your GitHub repo → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `OCI_TENANCY_NAMESPACE` | Your OCI namespace (e.g. `bmr6dpc3ujz4`) |
| `OCI_USERNAME` | `<namespace>/<email>` |
| `OCI_AUTH_TOKEN` | OCI Auth Token from Console |
| `GEMINI_API_KEY` | Google Gemini API key |
| `SONAR_TOKEN` | SonarQube token (optional) |
| `SONAR_HOST_URL` | SonarQube URL (optional) |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook (optional) |

---

## Monitoring Stack

### Install via Helm
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  -f monitoring/prometheus-values.yaml
```

### What it includes
- **Prometheus** — Scrapes metrics from all Gnosis pods every 30s
- **Grafana** — Pre-configured dashboards for CPU, memory, HTTP req/s, error rate, P95 latency
- **Alertmanager** — Fires Slack alerts for: pod crash loops, high CPU, high memory, service down, DB connections > 80

### Grafana Access
```bash
# If no LoadBalancer IP:
kubectl port-forward svc/kube-prometheus-stack-grafana 3000:80 -n monitoring
# Open http://localhost:3000 — use credentials from grafana-admin-secret K8s secret
```

---

## Kira — AIOps Assistant

Kira is an AI-powered operations assistant built with Streamlit + Google Gemini Flash.

**What it does:**
- Auto-scans cluster every 30 seconds for anomalies
- Shows live pod health and deployment status
- Queries Prometheus for HTTP req rate, error %, P95 latency, DB connections
- Diagnoses incidents using Gemini AI — gives root cause, fix steps, prevention tips
- Exports incident reports as `.txt`

**Access:**
```bash
kubectl port-forward svc/kira 8080:80 -n kira
# Open http://localhost:8080
```

**Or run locally:**
```bash
cd aiops
pip install -r requirements.txt
export GEMINI_API_KEY=your_key
export PROMETHEUS_URL=http://localhost:9090
streamlit run kira.py
```

---

## Security Policies (OPA Gatekeeper)

5 admission control policies enforced on all Gnosis deployments:

| Policy | Effect | What it blocks |
|--------|--------|----------------|
| `gnosis-no-privileged` | Deny | Privileged containers |
| `gnosis-require-limits` | Deny | Containers without CPU/memory limits |
| `gnosis-no-root` | Deny | Containers running as root (UID 0) |
| `gnosis-no-latest-tag` | Warn | `:latest` image tags |
| `gnosis-required-labels` | Warn | Deployments missing `app`, `project`, `monitoring` labels |

```bash
# Apply policies
kubectl apply -f gitops/opa/gatekeeper-policies.yaml
```

---

## ArgoCD — GitOps

ArgoCD watches `gitops/k8s/` in this repo. Every change to any manifest triggers an automatic sync to the OKE cluster.

**Access ArgoCD UI:**
```bash
kubectl port-forward svc/argocd-server 8443:443 -n argocd
# Open https://localhost:8443

# Get admin password:
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

---

## Cost

| Config | Cost |
|--------|------|
| OKE + VM.Standard.A1.Flex (4 OCPU, 24GB) | **₹0 — Always Free** |
| OKE + VM.Standard.E3.Flex (paid) | ~₹30-50/hour |
| OCIR storage | Free up to 500MB |
| Load Balancer | 1 free, extras billed |

> Recommended: Use `terraform destroy` when not demonstrating. `terraform apply` brings everything back in ~15 minutes.

---

## Local Development

```bash
cp gnosis/.env.example gnosis/.env
# Fill in DB_PASSWORD, JWT_SECRET, GEMINI_API_KEY

cd gnosis
docker-compose up --build
# App at http://localhost:80
```

---

## Destroy Infrastructure

```bash
cd infrastructure
terraform destroy
# Type 'yes' to confirm
# All OCI resources deleted in ~5 minutes
```

---

## Project Structure

```
gnosis-devops/
├── .github/workflows/
│   └── ci.yml              # GitHub Actions pipeline
├── aiops/
│   ├── kira.py             # Kira AIOps (Streamlit + Gemini)
│   ├── requirements.txt
│   └── kira-deployment.yaml
├── ansible/
│   └── roles/k8s-node/     # Node bootstrap playbooks
├── gitops/
│   ├── argocd-app.yaml     # ArgoCD Application manifest
│   ├── k8s/                # All K8s manifests (ArgoCD watches this)
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   ├── secrets.yaml
│   │   ├── network-policy.yaml
│   │   ├── api-gateway/    # deployment, service, hpa
│   │   ├── auth-service/
│   │   ├── content-service/
│   │   ├── progress-service/
│   │   ├── xp-service/
│   │   ├── battle-service/
│   │   ├── notification-service/
│   │   ├── frontend/
│   │   ├── postgres/
│   │   └── redis/
│   └── opa/
│       └── gatekeeper-policies.yaml
├── gnosis/                 # Application source code
│   ├── api-gateway/
│   ├── auth-service/
│   ├── content-service/
│   ├── progress-service/
│   ├── xp-service/
│   ├── battle-service/
│   ├── notification-service/
│   ├── frontend/
│   ├── kira/               # Kira AIOps service
│   └── common/             # Shared metrics module
├── infrastructure/
│   ├── main.tf             # OCI provider, VCN, OKE modules
│   ├── variables.tf
│   ├── outputs.tf
│   └── modules/
│       ├── oci-vcn/        # Virtual Cloud Network
│       ├── oci-oke/        # Kubernetes cluster
│       └── oci-registry/   # Container registry
└── monitoring/
    └── prometheus-values.yaml  # Grafana dashboards + alert rules
```
