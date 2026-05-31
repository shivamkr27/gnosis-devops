# ─── infrastructure/modules/oci-registry/main.tf ─────────────────────
# OCI Container Image Registry (OCIR) — equivalent to AWS ECR
# Creates one repository per Gnosis service.
# ─────────────────────────────────────────────────────────────────────

variable "compartment_id"    { type = string }
variable "project"           { type = string }
variable "oci_region" {
  type    = string
  default = "ap-mumbai-1"
}
variable "tenancy_namespace" {
  type        = string
  description = "OCI tenancy namespace for OCIR URL"
}
variable "repositories" {
  type = list(string)
  default = [
    "gnosis/api-gateway",
    "gnosis/auth-service",
    "gnosis/content-service",
    "gnosis/progress-service",
    "gnosis/xp-service",
    "gnosis/battle-service",
    "gnosis/notification-service",
    "gnosis/frontend",
    "gnosis/kira"
  ]
}

resource "oci_artifacts_container_repository" "gnosis" {
  for_each = toset(var.repositories)

  compartment_id = var.compartment_id
  display_name   = each.value

  is_public    = false
  is_immutable = false
}

# ─── outputs ────────────────────────────────────────────────────────
output "registry_url" {
  value       = "${var.oci_region}.ocir.io/${var.tenancy_namespace}"
  description = "OCIR base URL — prefix all image tags with this"
}

output "repository_ids" {
  value = { for k, v in oci_artifacts_container_repository.gnosis : k => v.id }
}
