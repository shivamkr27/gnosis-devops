variable "compartment_id" {
  type = string
}

variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "vcn_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "kubernetes_version" {
  type    = string
  default = "v1.32.1"
}

variable "node_shape" {
  type    = string
  default = "VM.Standard.A1.Flex"
}

variable "node_ocpus" {
  type    = number
  default = 2
}

variable "node_memory_gb" {
  type    = number
  default = 12
}

variable "node_count" {
  type    = number
  default = 2
}

variable "boot_volume_gb" {
  type    = number
  default = 50
}

variable "ssh_public_key" {
  type    = string
  default = ""
}

# ─── outputs ────────────────────────────────────────────────────────
output "cluster_id" {
  value = oci_containerengine_cluster.gnosis.id
}

output "cluster_endpoint" {
  value = oci_containerengine_cluster.gnosis.endpoints[0].private_endpoint
}

output "node_pool_id" {
  value = oci_containerengine_node_pool.gnosis.id
}
