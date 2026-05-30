output "cluster_name" {
  description = "EKS Cluster name — use in kubectl config"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS API endpoint"
  value       = module.eks.cluster_endpoint
}

output "ecr_repository_urls" {
  description = "ECR repo URLs for all Gnosis services"
  value       = module.ecr.repository_urls
}

output "configure_kubectl" {
  description = "Run this command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${var.cluster_name}"
}
