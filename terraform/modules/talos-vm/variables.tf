# -----------------------------------------------------------------------------
# Required Variables (per-VM)
# -----------------------------------------------------------------------------

variable "vm_id" {
  description = "Proxmox VM ID"
  type        = number
}

variable "name" {
  description = "VM hostname"
  type        = string
}

variable "proxmox_node" {
  description = "Proxmox node to deploy on"
  type        = string
}

variable "mac_address" {
  description = "MAC address for the network interface"
  type        = string
}

# -----------------------------------------------------------------------------
# Optional Variables (common defaults from existing VMs)
# -----------------------------------------------------------------------------

variable "cores" {
  description = "Number of CPU cores per socket"
  type        = number
  default     = 4
}

variable "sockets" {
  description = "Number of CPU sockets"
  type        = number
  default     = 4
}

variable "memory" {
  description = "Memory in MB"
  type        = number
  default     = 65536 # 64GB
}

variable "cpu_type" {
  description = "CPU type"
  type        = string
  default     = "host"
}

variable "disk_size" {
  description = "Disk size in GB"
  type        = number
  default     = 1024 # 1TB
}

variable "storage_pool" {
  description = "Proxmox storage pool for VM disk"
  type        = string
  default     = "zfs"
}

variable "network_bridge" {
  description = "Network bridge for VM"
  type        = string
  default     = "vmbr1"
}

variable "onboot" {
  description = "Start VM on host boot"
  type        = bool
  default     = true
}

variable "protection" {
  description = "Enable VM protection (prevents accidental deletion)"
  type        = bool
  default     = true
}

variable "qemu_agent" {
  description = "Enable QEMU guest agent"
  type        = bool
  default     = true
}

variable "firewall" {
  description = "Enable firewall on network interface"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to the VM"
  type        = list(string)
  default     = ["talos", "kubernetes"]
}
