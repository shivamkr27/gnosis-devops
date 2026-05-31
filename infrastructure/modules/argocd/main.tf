variable "cluster_endpoint" {
  description = "OKE cluster API endpoint"
  type        = string
}

variable "cluster_id" {
  description = "OKE cluster OCID (used for oci ce generate-token)"
  type        = string
}

variable "region" {
  description = "OCI region"
  type        = string
  default     = "ap-mumbai-1"
}

terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

provider "helm" {
  kubernetes {
    host = var.cluster_endpoint
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "oci"
      args = [
        "ce", "cluster", "generate-token",
        "--cluster-id", var.cluster_id,
        "--region", var.region
      ]
    }
  }
}

resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  namespace        = "argocd"
  create_namespace = true
  version          = "6.7.3"

  values = [<<EOF
server:
  service:
    type: LoadBalancer
configs:
  params:
    server.insecure: true
EOF
  ]
}
