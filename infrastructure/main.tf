terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state — S3 + DynamoDB locking
  # Create these manually once before terraform init:
  #   aws s3 mb s3://gnosis-terraform-state-<YOUR_ACCOUNT_ID> --region ap-south-1
  #   aws dynamodb create-table --table-name gnosis-terraform-locks \
  #     --attribute-definitions AttributeName=LockID,AttributeType=S \
  #     --key-schema AttributeName=LockID,KeyType=HASH \
  #     --billing-mode PAY_PER_REQUEST --region ap-south-1
  backend "s3" {
    bucket         = "gnosis-terraform-state"   # Change to your bucket name
    key            = "prod/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "gnosis-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

# ─── VPC ────────────────────────────────────────────────────────────
module "vpc" {
  source = "./modules/vpc"

  project              = var.project
  vpc_cidr             = var.vpc_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  availability_zones   = var.availability_zones
}

# ─── EKS ────────────────────────────────────────────────────────────
module "eks" {
  source = "./modules/eks"

  project            = var.project
  cluster_name       = var.cluster_name
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids
  node_instance_type = var.node_instance_type
  node_min           = var.node_min
  node_max           = var.node_max
  node_desired       = var.node_desired
}

# ─── ECR ────────────────────────────────────────────────────────────
module "ecr" {
  source = "./modules/ecr"

  repositories = var.gnosis_services
}

# ─── ArgoCD ─────────────────────────────────────────────────────────
module "argocd" {
  source = "./modules/argocd"

  cluster_endpoint       = module.eks.cluster_endpoint
  cluster_ca_certificate = module.eks.cluster_ca_certificate
  cluster_name           = module.eks.cluster_name

  depends_on = [module.eks]
}
