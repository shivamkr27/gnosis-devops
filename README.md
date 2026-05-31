# Gnosis DevOps — Production Infrastructure (Oracle Cloud)

Gnosis is a gamified learning platform for BTech students, deployed on **Oracle Cloud Infrastructure (OCI)** with a complete DevSecOps pipeline.

## Architecture

```
Developer Push → GitHub Actions CI
                      ↓
              SonarQube SAST + OWASP + Checkov
                      ↓
              Docker Build + Trivy Scan + SBOM
                      ↓
              Push to OCIR (ap-mumbai-1.ocir.io)
                      ↓
              Update GitOps Manifests (image tags)
                      ↓
              ArgoCD Auto-Sync → OKE (Oracle K8s)
                      ↓
              Prometheus + Grafana + Alertmanager
                      ↓
              Kira AIOps (Gemini Flash)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Application | Node.js, React, Socket.io, PostgreSQL, Redis |
| Containers | Docker, OCI Container Registry (OCIR) |
| Orchestration | Kubernetes (OKE), ArgoCD |
| Infrastructure | Terraform (OCI VCN, OKE, OCIR) |
| CI/CD | GitHub Actions |
| Security | Trivy, SonarQube, OWASP, Checkov, Cosign, Falco, OPA Gatekeeper |
| Observability | Prometheus, Grafana, Alertmanager, Loki |
| AIOps | Kira (Gemini Flash) |
| Provisioning | Ansible |

## Microservices

| Service | Port | Responsibility |
|---------|------|---------------|
| api-gateway | 3000 | JWT auth, routing, WebSocket upgrade |
| auth-service | 3001 | Login, register, friends |
| content-service | 3002 | Subjects, levels, Gemini AI questions |
| progress-service | 3003 | XP award, level unlock, streaks |
| xp-service | 3004 | Leaderboard, XP ledger |
| battle-service | 3005 | Real-time 1v1 + group quiz (Socket.io) |
| notification-service | 3006 | Online presence, challenge alerts |

## OCI Account Details

| Setting | Value |
|---------|-------|
| Tenancy | sitaramchaturvedi |
| Region | ap-mumbai-1 (Mumbai) |
| Registry | ap-mumbai-1.ocir.io/bmr6dpc3ujz4 |
| Node Shape | VM.Standard.A1.Flex (Always Free) |
| Node Config | 2 nodes × 2 OCPU / 12 GB RAM |

## Setup Guide

### Step 1 — OCI CLI Config (local machine)

Create `~/.oci/config`:
```ini
[DEFAULT]
user=ocid1.user.oc1..aaaaaaaawrzkhjyrsnstq4ap66jv7zs5nzewhy3pugd2drqpiiyoewkocc7a
fingerprint=4f:2d:a1:67:68:6a:83:d0:94:7b:96:15:43:a2:eb:43
tenancy=ocid1.tenancy.oc1..aaaaaaaate7a35g6vwttcmrw24uikrnovuzdnaej4ywme24xw7qxrkbmavuq
region=ap-mumbai-1
key_file=~/.oci/oci_api_key.pem
```

Save your private key to `~/.oci/oci_api_key.pem` (chmod 600).

Verify: `oci iam user get --user-id <your-user-ocid>`

### Step 2 — SSH Key for OKE Nodes

```bash
ssh-keygen -t rsa -b 2048 -f ~/.ssh/gnosis-oke -N ""
# Copy output of:
cat ~/.ssh/gnosis-oke.pub
# Paste into infrastructure/terraform.tfvars → ssh_public_key
```

### Step 3 — Terraform: Create Infrastructure

```bash
cd infrastructure
terraform init
terraform plan
terraform apply
```

After apply:
```bash
# Get kubeconfig (command shown in terraform outputs)
oci ce cluster create-kubeconfig \
  --cluster-id <cluster-id-from-output> \
  --region ap-mumbai-1 \
  --token-version 2.0.0 \
  --kube-endpoint PUBLIC_ENDPOINT

kubectl get nodes   # verify cluster is ready
```

### Step 4 — Deploy Gnosis to OKE

```bash
# Apply K8s manifests
kubectl apply -f gitops/k8s/namespace.yaml
kubectl apply -f gitops/k8s/secrets.yaml        # fill real values first!
kubectl apply -f gitops/k8s/configmap.yaml
kubectl apply -f gitops/k8s/

# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Apply ArgoCD app (points to this repo)
kubectl apply -f gitops/argocd-app.yaml

# Get ArgoCD initial password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

### Step 5 — GitHub Actions Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions:

| Secret Name | Value |
|-------------|-------|
| `OCI_TENANCY_NAMESPACE` | `bmr6dpc3ujz4` |
| `OCI_USERNAME` | `bmr6dpc3ujz4/sitaramchaturvedi` |
| `OCI_AUTH_TOKEN` | `oDXkW]x<N0-y[Dkq<4Fy` |
| `GEMINI_API_KEY` | your Gemini API key |
| `SONAR_TOKEN` | SonarQube token (optional) |
| `SONAR_HOST_URL` | SonarQube URL (optional) |
| `SLACK_WEBHOOK_URL` | Slack webhook (optional) |

### Step 6 — Monitoring

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  -f monitoring/prometheus-values.yaml
```

### Step 7 — Kira AIOps

```bash
cd aiops
pip install -r requirements.txt
export GEMINI_API_KEY=your_key
export PROMETHEUS_URL=http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090
streamlit run kira.py
```

## Local Development

```bash
cp .env.example .env     # fill in values
docker-compose up --build
```

App runs at http://localhost:80

## Cost

OCI Always Free tier:
| Resource | Cost |
|----------|------|
| OKE Control Plane | Free |
| 2× VM.Standard.A1.Flex nodes | Free (4 OCPU, 24GB total) |
| OCIR | Free up to 500MB |
| **Total** | **₹0** |

> Run `terraform destroy` when not showcasing. `terraform apply` brings it back in ~15 minutes.

## CI/CD Flow

Every `git push` to `main`:
1. SonarQube SAST scan
2. OWASP npm audit (all 7 services)
3. Checkov scan (Terraform + K8s manifests)
4. Build all 8 Docker images in parallel
5. Trivy scan each image (blocks on CRITICAL CVEs)
6. Generate SBOM (Syft)
7. Push signed images to OCIR (Cosign)
8. Update image tags in GitOps manifests
9. ArgoCD auto-syncs to OKE cluster
10. Slack alert on failure
