variable "compartment_id"     { type = string }
variable "project"            { type = string }
variable "environment"        { type = string }
variable "vcn_id"             { type = string }
variable "public_subnet_ids"  { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "kubernetes_version" {
  type    = string
  default = "v1.32.1"
}

output "cluster_id" {
  value = oci_containerengine_cluster.gnosis.id
}

output "cluster_endpoint" {
  value = oci_containerengine_cluster.gnosis.endpoints[0].public_endpoint
}
