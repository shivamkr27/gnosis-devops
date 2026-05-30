variable "repositories" { type = list(string) }

resource "aws_ecr_repository" "repos" {
  for_each     = toset(var.repositories)
  name         = each.value
  force_delete = true

  image_scanning_configuration {
    scan_on_push = true   # Auto Trivy scan on every push
  }

  image_tag_mutability = "MUTABLE"
}

# Lifecycle policy — keep only last 10 images per repo (cost saving)
resource "aws_ecr_lifecycle_policy" "repos" {
  for_each   = aws_ecr_repository.repos
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

output "repository_urls" {
  value = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
}
