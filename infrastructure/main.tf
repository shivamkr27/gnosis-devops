terraform {
  required_version = ">= 1.5"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }

  # Local state for initial setup.
  # To migrate to OCI Object Storage later, uncomment the s3 backend below
  # and run: terraform init -migrate-state
  #
  # backend "s3" {
  #   bucket                      = "gnosis-tfstate"
  #   key                         = "prod/terraform.tfstate"
  #   region                      = "ap-mumbai-1"
  #   endpoint                    = "https://bmr6dpc3ujz4.compat.objectstorage.ap-mumbai-1.oraclecloud.com"
  #   skip_credentials_validation = true
  #   skip_region_validation      = true
  #   skip_metadata_api_check     = true
  #   force_path_style            = true
  # }

  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "oci" {
  tenancy_ocid = var.tenancy_ocid
  user_ocid    = var.user_ocid
  fingerprint  = var.fingerprint
  private_key  = var.private_key
  region       = var.region
}

# ── Virtual Cloud Network ────────────────────────────────────────────
module "vcn" {
  source = "./modules/oci-vcn"

  compartment_id       = var.compartment_ocid
  project              = var.project
  environment          = var.environment
  vcn_cidr             = var.vcn_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

# ── OKE Kubernetes Cluster ───────────────────────────────────────────
module "oke" {
  source = "./modules/oci-oke"

  compartment_id     = var.compartment_ocid
  project            = var.project
  environment        = var.environment
  vcn_id             = module.vcn.vcn_id
  public_subnet_ids  = module.vcn.public_subnet_ids
  private_subnet_ids = module.vcn.private_subnet_ids
  node_shape         = var.node_shape
  node_ocpus         = var.node_ocpus
  node_memory_gb     = var.node_memory_gb
  node_count         = var.node_count
  ssh_public_key     = var.ssh_public_key

  depends_on = [module.vcn]
}

# ── Container Registry (OCIR) ────────────────────────────────────────
module "registry" {
  source = "./modules/oci-registry"

  compartment_id    = var.compartment_ocid
  project           = var.project
  oci_region        = var.region
  tenancy_namespace = var.tenancy_namespace
}

# ── ArgoCD (install after cluster is ready) ──────────────────────────
# Uncomment after `terraform apply` creates the OKE cluster and you
# have run the kubeconfig command from outputs.
#
# module "argocd" {
#   source = "./modules/argocd"
#
#   cluster_endpoint = module.oke.cluster_endpoint
#   cluster_id       = module.oke.cluster_id
#   region           = var.region
#
#   depends_on = [module.oke]
# }
