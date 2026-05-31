# ─── infrastructure/modules/oci-oke/main.tf ──────────────────────────
# OCI Kubernetes Engine (OKE) — equivalent to AWS EKS
# Creates: OKE cluster + node pool in private subnets
# ─────────────────────────────────────────────────────────────────────

# ── OKE Cluster ──────────────────────────────────────────────────────
resource "oci_containerengine_cluster" "gnosis" {
  compartment_id     = var.compartment_id
  name               = "${var.project}-cluster"
  kubernetes_version = var.kubernetes_version
  vcn_id             = var.vcn_id

  endpoint_config {
    # API server accessible from within VCN only (private endpoint)
    is_public_ip_enabled = false
    subnet_id            = var.private_subnet_ids[0]
  }

  options {
    service_lb_subnet_ids = [var.public_subnet_ids[0]]

    add_ons {
      is_kubernetes_dashboard_enabled = false
      is_tiller_enabled               = false
    }

    admission_controller_options {
      is_pod_security_policy_enabled = false   # We use OPA Gatekeeper instead
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

# ── Node Pool ─────────────────────────────────────────────────────────
resource "oci_containerengine_node_pool" "gnosis" {
  compartment_id     = var.compartment_id
  cluster_id         = oci_containerengine_cluster.gnosis.id
  name               = "${var.project}-node-pool"
  kubernetes_version = var.kubernetes_version

  node_shape = var.node_shape   # e.g. VM.Standard.A1.Flex (ARM, free tier)

  node_shape_config {
    ocpus         = var.node_ocpus
    memory_in_gbs = var.node_memory_gb
  }

  node_config_details {
    size = var.node_count

    # Spread nodes across private subnets (multi-AD for HA)
    dynamic "placement_configs" {
      for_each = var.private_subnet_ids
      content {
        availability_domain = data.oci_identity_availability_domains.ads.availability_domains[
          placement_configs.key % length(data.oci_identity_availability_domains.ads.availability_domains)
        ].name
        subnet_id           = placement_configs.value
      }
    }

    # Node security — no public IPs on worker nodes
    is_pv_encryption_in_transit_enabled = true

    node_pool_pod_network_option_details {
      cni_type          = "FLANNEL_OVERLAY"
      pod_subnet_ids    = var.private_subnet_ids
    }
  }

  node_source_details {
    # Oracle Linux 8 (OKE optimized image)
    image_id    = data.oci_core_images.oke_node_image.images[0].id
    source_type = "IMAGE"

    # Boot volume size
    boot_volume_size_in_gbs = var.boot_volume_gb
  }

  # SSH key for emergency node access (use Ansible instead normally)
  ssh_public_key = var.ssh_public_key

  freeform_tags = {
    project     = var.project
    environment = var.environment
  }
}

# ── Data sources ─────────────────────────────────────────────────────
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_id
}

data "oci_core_images" "oke_node_image" {
  compartment_id           = var.compartment_id
  operating_system         = "Oracle Linux"
  operating_system_version = "8"
  shape                    = var.node_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"

  filter {
    name   = "display_name"
    values = ["Oracle-Linux-8.*-aarch64-.*"]
    regex  = true
  }
}
