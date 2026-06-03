# ─── infrastructure/modules/oci-vcn/main.tf ──────────────────────────
# OCI Virtual Cloud Network — equivalent to AWS VPC
# Creates: VCN, Internet Gateway, NAT Gateway,
#          public subnets (load balancer), private subnets (nodes)
# ─────────────────────────────────────────────────────────────────────

terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
}

# ── VCN ──────────────────────────────────────────────────────────────
resource "oci_core_vcn" "gnosis" {
  compartment_id = var.compartment_id
  cidr_blocks    = [var.vcn_cidr]
  display_name   = "${var.project}-vcn"
  dns_label      = var.project

  freeform_tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# ── Internet Gateway (for public subnets) ────────────────────────────
resource "oci_core_internet_gateway" "gnosis" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.gnosis.id
  enabled        = true
  display_name   = "${var.project}-igw"
}

# ── NAT Gateway (for private subnets → outbound only) ───────────────
resource "oci_core_nat_gateway" "gnosis" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.gnosis.id
  display_name   = "${var.project}-nat"
  block_traffic  = false
}

# ── Route table: public (via IGW) ───────────────────────────────────
resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.gnosis.id
  display_name   = "${var.project}-public-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.gnosis.id
  }
}

# ── Route table: private (via NAT) ───────────────────────────────────
resource "oci_core_route_table" "private" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.gnosis.id
  display_name   = "${var.project}-private-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_nat_gateway.gnosis.id
  }
}

# ── Security list: public subnet ─────────────────────────────────────
resource "oci_core_security_list" "public" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.gnosis.id
  display_name   = "${var.project}-public-sl"

  # Allow all outbound
  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  # Allow HTTP/HTTPS inbound (load balancer)
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 80
      max = 80
    }
  }
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 443
      max = 443
    }
  }
  # Kubernetes API server
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 6443
      max = 6443
    }
  }
  # OKE node registration tunnel
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 12250
      max = 12250
    }
  }
  # ICMP for path MTU discovery
  ingress_security_rules {
    protocol = "1"
    source   = "0.0.0.0/0"
    icmp_options {
      type = 3
      code = 4
    }
  }
}

# ── Security list: private subnet (nodes) ───────────────────────────
resource "oci_core_security_list" "private" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.gnosis.id
  display_name   = "${var.project}-private-sl"

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  # Allow inbound from VCN only (node-to-node + LB → nodes)
  ingress_security_rules {
    protocol = "all"
    source   = var.vcn_cidr
  }
}

# ── Public subnets (for OCI Load Balancer) ───────────────────────────
resource "oci_core_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.gnosis.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  display_name      = "${var.project}-public-${count.index + 1}"
  dns_label         = "public${count.index + 1}"
  route_table_id    = oci_core_route_table.public.id
  security_list_ids = [oci_core_security_list.public.id]

  # Public subnet — LB nodes get public IPs
  prohibit_public_ip_on_vnic = false

  freeform_tags = {
    project     = var.project
    environment = var.environment
    tier        = "public"
  }
}

# ── Private subnets (for OKE worker nodes) ──────────────────────────
resource "oci_core_subnet" "private" {
  count = length(var.private_subnet_cidrs)

  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.gnosis.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  display_name      = "${var.project}-private-${count.index + 1}"
  dns_label         = "private${count.index + 1}"
  route_table_id    = oci_core_route_table.private.id
  security_list_ids = [oci_core_security_list.private.id]

  # Private subnet — worker nodes get NO public IPs
  prohibit_public_ip_on_vnic = true

  freeform_tags = {
    project     = var.project
    environment = var.environment
    tier        = "private"
  }
}
