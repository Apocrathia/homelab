# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "vm_id" {
  description = "The VM ID in Proxmox"
  value       = proxmox_virtual_environment_vm.this.vm_id
}

output "name" {
  description = "The VM name"
  value       = proxmox_virtual_environment_vm.this.name
}

output "node_name" {
  description = "The Proxmox node the VM is running on"
  value       = proxmox_virtual_environment_vm.this.node_name
}

output "mac_address" {
  description = "The MAC address of the primary network interface"
  value       = proxmox_virtual_environment_vm.this.network_device[0].mac_address
}

output "ipv4_addresses" {
  description = "IPv4 addresses reported by QEMU agent"
  value       = proxmox_virtual_environment_vm.this.ipv4_addresses
}

output "ipv6_addresses" {
  description = "IPv6 addresses reported by QEMU agent"
  value       = proxmox_virtual_environment_vm.this.ipv6_addresses
}
