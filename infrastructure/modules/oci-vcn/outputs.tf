# ─── infrastructure/modules/oci-vcn/outputs.tf ───────────────────────
output "vcn_id"             { value = oci_core_vcn.gnosis.id }
output "public_subnet_ids"  { value = oci_core_subnet.public[*].id }
output "private_subnet_ids" { value = oci_core_subnet.private[*].id }
