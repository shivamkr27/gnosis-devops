variable "tenancy_ocid" {
  description = "OCI Tenancy OCID"
  type        = string
}

variable "user_ocid" {
  description = "OCI User OCID for API key authentication"
  type        = string
}

variable "fingerprint" {
  description = "OCI API key fingerprint"
  type        = string
}

variable "private_key" {
  description = "OCI API signing private key (full PEM content including headers)"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "OCI region"
  type        = string
  default     = "ap-mumbai-1"
}

variable "compartment_ocid" {
  description = "OCI Compartment OCID (root tenancy OCID for single-compartment setup)"
  type        = string
}

variable "tenancy_namespace" {
  description = "OCI tenancy namespace — used in OCIR image URLs (e.g. bmr6dpc3ujz4)"
  type        = string
}

variable "project" {
  description = "Project name prefix for all resources"
  type        = string
  default     = "gnosis"
}

variable "environment" {
  description = "Environment tag"
  type        = string
  default     = "prod"
}

variable "vcn_cidr" {
  description = "VCN CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs (OCI Load Balancer lives here)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDRs (OKE worker nodes — no public IPs)"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "node_shape" {
  description = "OCI compute shape for OKE worker nodes"
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "node_ocpus" {
  description = "OCPUs per node (OCI Always Free: 4 total across all A1 instances)"
  type        = number
  default     = 2
}

variable "node_memory_gb" {
  description = "Memory in GB per node (OCI Always Free: 24GB total)"
  type        = number
  default     = 12
}

variable "node_count" {
  description = "Number of OKE worker nodes"
  type        = number
  default     = 2
}

variable "ssh_public_key" {
  description = "SSH public key for emergency node access. Generate: ssh-keygen -t rsa -b 2048 -f ~/.ssh/gnosis-oke"
  type        = string
  default     = ""
}
