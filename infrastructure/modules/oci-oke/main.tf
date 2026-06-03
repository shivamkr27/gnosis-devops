# ─── infrastructure/modules/oci-oke/main.tf ──────────────────────────
# OCI Kubernetes Engine (OKE) — creates cluster only.
# Node pool is managed manually from OCI Console (VM.Standard.E3.Flex).
# ─────────────────────────────────────────────────────────────────────

resource "oci_containerengine_cluster" "gnosis" {
  compartment_id     = var.compartment_id
  name               = "${var.project}-cluster"
  kubernetes_version = var.kubernetes_version
  vcn_id             = var.vcn_id

  endpoint_config {
    is_public_ip_enabled = true
    subnet_id            = var.public_subnet_ids[0]
  }

  options {
    service_lb_subnet_ids = [var.public_subnet_ids[0]]

    add_ons {
      is_kubernetes_dashboard_enabled = false
      is_tiller_enabled               = false
    }

    admission_controller_options {
      is_pod_security_policy_enabled = false
    }

    kubernetes_network_config {
      pods_cidr     = "10.244.0.0/16"
      services_cidr = "10.96.0.0/16"
    }
  }

  freeform_tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Node pool outputs (node pool managed from OCI Console)
