# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "vm_id" {
  description = "Proxmox VM ID"
  value       = proxmox_virtual_environment_vm.this.vm_id
}

output "name" {
  description = "VM name"
  value       = proxmox_virtual_environment_vm.this.name
}

output "node_name" {
  description = "Proxmox node currently running the VM (informational; may change under HA)"
  value       = proxmox_virtual_environment_vm.this.node_name
}

output "mac_address" {
  description = "Primary network interface MAC address"
  value       = proxmox_virtual_environment_vm.this.network_device[0].mac_address
}

output "ipv4_addresses" {
  description = "IPv4 addresses reported by the QEMU guest agent"
  value       = proxmox_virtual_environment_vm.this.ipv4_addresses
}

output "ipv6_addresses" {
  description = "IPv6 addresses reported by the QEMU guest agent"
  value       = proxmox_virtual_environment_vm.this.ipv6_addresses
}

output "ha_enabled" {
  description = "Whether the VM is managed by Proxmox HA"
  value       = var.ha.enabled
}
