# ─── infrastructure/modules/oci-registry/main.tf ─────────────────────
# OCI Container Image Registry (OCIR) — equivalent to AWS ECR
# Creates one repository per Gnosis service.
# ─────────────────────────────────────────────────────────────────────

resource "oci_artifacts_container_repository" "gnosis" {
  for_each = toset(var.repositories)

  compartment_id = var.compartment_id
  display_name   = each.value   # e.g. "gnosis/api-gateway"

  # Private repo — only authenticated OCI users can push/pull
  is_public = false

  # Immutable tags — pushed image tags cannot be overwritten
  # (forces CI to always push new SHA tag, never reuse)
  is_immutable = false   # set true in prod after initial setup

  freeform_tags = {
    project    = var.project
    managed_by = "terraform"
  }
}

# ── Lifecycle policy — keep last 20 images per repo ──────────────────
# OCI doesn't have native lifecycle policies like ECR,
# but we can enforce this via a null_resource + OCI CLI
resource "null_resource" "cleanup_old_images" {
  for_each = toset(var.repositories)

  triggers = {
    repo_name = each.value
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Image cleanup for ${each.value} can be done via:"
      echo "oci artifacts container image list --compartment-id ${var.compartment_id} \\\n+        --repository-name ${each.value} --sort-by TIMECREATED --sort-order DESC \\\n+        | jq '.data.items[20:][].id' \\\n+        | xargs -I{} oci artifacts container image delete --image-id {} --force"
    EOT
  }

  depends_on = [oci_artifacts_container_repository.gnosis]
}

# ─── variables.tf ───────────────────────────────────────────────────
variable "compartment_id" { type = string }
variable "project"        { type = string }
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

# ─── outputs.tf ─────────────────────────────────────────────────────
output "registry_url" {
  value       = "${var.oci_region}.ocir.io/${var.tenancy_namespace}"
  description = "OCIR URL — use as image prefix in CI/CD"
}

output "repository_ids" {
  value = { for k, v in oci_artifacts_container_repository.gnosis : k => v.id }
}
