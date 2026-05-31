# ─── infrastructure/environments/prod/main.tf ────────────────────────
# Production environment — OCI
# Usage: cd infrastructure/environments/prod
#        terraform init && terraform plan && terraform apply
#
# Required env vars / secrets:
#   TF_VAR_compartment_id  → OCI Compartment OCID
#   TF_VAR_tenancy_id      → OCI Tenancy OCID
#   TF_VAR_ssh_public_key  → SSH public key for node emergency access
#   OCI_CLI_AUTH=api_key   → or instance_principal inside OCI
# ─────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.5"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }

  # OCI Object Storage remote state
  # Uncomment after first manual terraform init with local backend,
  # then migrate: terraform init -migrate-state
  #
  # backend "s3" {
  #   bucket                      = "gnosis-tfstate"
  #   key                         = "prod/terraform.tfstate"
  #   region                      = "ap-mumbai-1"
  #   endpoint                    = "https://<tenancy-namespace>.compat.objectstorage.ap-mumbai-1.oraclecloud.com"
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
  region           = var.oci_region
  tenancy_ocid     = var.tenancy_id
  # When running locally: uses ~/.oci/config
  # When running in OCI: uses instance_principal (no keys needed)
}

# ── VCN ──────────────────────────────────────────────────────────────
module "vcn" {
  source = "../../modules/oci-vcn"

  compartment_id       = var.compartment_id
  project              = var.project
  environment          = "prod"
  vcn_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]
}

# ── OKE Cluster ─────────────────────────────────────────────────────
module "oke" {
  source = "../../modules/oci-oke"

  compartment_id     = var.compartment_id
  project            = var.project
  environment        = "prod"
  vcn_id             = module.vcn.vcn_id
  public_subnet_ids  = module.vcn.public_subnet_ids
  private_subnet_ids = module.vcn.private_subnet_ids
  kubernetes_version = "v1.29.1"

  # OCI Always Free: VM.Standard.A1.Flex — 4 OCPU, 24GB total free
  node_shape      = "VM.Standard.A1.Flex"
  node_ocpus      = 2
  node_memory_gb  = 12
  node_count      = 2
  ssh_public_key  = var.ssh_public_key
}

# ── Container Registry ────────────────────────────────────────────────
module "registry" {
  source = "../../modules/oci-registry"

  compartment_id    = var.compartment_id
  project           = var.project
  oci_region        = var.oci_region
  tenancy_namespace = var.tenancy_namespace
}

# ─── variables.tf ───────────────────────────────────────────────────
variable "oci_region"        { type = string  default = "ap-mumbai-1" }
variable "tenancy_id"        { type = string }
variable "compartment_id"    { type = string }
variable "tenancy_namespace" { type = string  description = "OCI tenancy namespace for OCIR URL" }
variable "project"           { type = string  default = "gnosis" }
variable "ssh_public_key"    { type = string }

# ─── outputs.tf ─────────────────────────────────────────────────────
output "oke_cluster_id"    { value = module.oke.cluster_id }
output "oke_endpoint"      { value = module.oke.cluster_endpoint }
output "ocir_url"          { value = module.registry.registry_url }
output "kubeconfig_cmd" {
  value       = "oci ce cluster create-kubeconfig --cluster-id ${module.oke.cluster_id} --region ${var.oci_region} --token-version 2.0.0"
  description = "Run this after terraform apply to get kubeconfig"
}
