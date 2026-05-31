output "oke_cluster_id" {
  description = "OKE Cluster OCID"
  value       = module.oke.cluster_id
}

output "oke_endpoint" {
  description = "OKE API server private endpoint"
  value       = module.oke.cluster_endpoint
}

output "ocir_base_url" {
  description = "OCIR base URL — prefix all Docker image names with this"
  value       = "${var.region}.ocir.io/${var.tenancy_namespace}"
}

output "kubeconfig_cmd" {
  description = "Run this after terraform apply to configure kubectl"
  value       = "oci ce cluster create-kubeconfig --cluster-id ${module.oke.cluster_id} --region ${var.region} --token-version 2.0.0 --kube-endpoint PUBLIC_ENDPOINT"
}

output "ocir_docker_login" {
  description = "Docker login command for OCIR (use Auth Token as password)"
  value       = "docker login ${var.region}.ocir.io -u '${var.tenancy_namespace}/sitaramchaturvedi'"
}
