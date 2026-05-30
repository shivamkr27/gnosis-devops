variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"  # Mumbai — low latency from India
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "gnosis-cluster"
}

variable "project" {
  description = "Project name prefix"
  type        = string
  default     = "gnosis"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDRs (nodes run here)"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "availability_zones" {
  description = "AZs for subnets"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}

variable "node_instance_type" {
  description = "EC2 instance type for EKS nodes"
  type        = string
  default     = "t3.medium"
}

variable "node_min" {
  type    = number
  default = 1
}

variable "node_max" {
  type    = number
  default = 3
}

variable "node_desired" {
  type    = number
  default = 2
}

variable "gnosis_services" {
  description = "List of Gnosis microservices for ECR repos"
  type        = list(string)
  default = [
    "gnosis/api-gateway",
    "gnosis/auth-service",
    "gnosis/content-service",
    "gnosis/progress-service",
    "gnosis/xp-service",
    "gnosis/battle-service",
    "gnosis/notification-service",
    "gnosis/frontend"
  ]
}
