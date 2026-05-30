variable "project" {}
variable "vpc_cidr" {}
variable "public_subnet_cidrs" { type = list(string) }
variable "private_subnet_cidrs" { type = list(string) }
variable "availability_zones" { type = list(string) }

# ─── VPC ────────────────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.project}-vpc" }
}

# ─── Internet Gateway ────────────────────────────────────────────────
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project}-igw" }
}

# ─── Public Subnets (Load Balancers) ────────────────────────────────
resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                                = "${var.project}-public-${count.index + 1}"
    "kubernetes.io/role/elb"            = "1"
    "kubernetes.io/cluster/${var.project}-cluster" = "shared"
  }
}

# ─── Private Subnets (EKS Nodes) ────────────────────────────────────
resource "aws_subnet" "private" {
  count = length(var.private_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name                                          = "${var.project}-private-${count.index + 1}"
    "kubernetes.io/role/internal-elb"             = "1"
    "kubernetes.io/cluster/${var.project}-cluster" = "shared"
  }
}

# ─── NAT Gateway (nodes in private subnet need internet) ────────────
resource "aws_eip" "nat" {
  count  = length(var.public_subnet_cidrs)
  domain = "vpc"
  tags   = { Name = "${var.project}-nat-eip-${count.index + 1}" }
}

resource "aws_nat_gateway" "nat" {
  count         = length(var.public_subnet_cidrs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags          = { Name = "${var.project}-nat-${count.index + 1}" }
  depends_on    = [aws_internet_gateway.igw]
}

# ─── Route Tables ────────────────────────────────────────────────────
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = { Name = "${var.project}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = length(aws_subnet.private)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat[count.index].id
  }

  tags = { Name = "${var.project}-private-rt-${count.index + 1}" }
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# ─── Outputs ─────────────────────────────────────────────────────────
output "vpc_id"             { value = aws_vpc.main.id }
output "public_subnet_ids"  { value = aws_subnet.public[*].id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
