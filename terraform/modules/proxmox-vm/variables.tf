# -----------------------------------------------------------------------------
# Required Variables
# -----------------------------------------------------------------------------

variable "vm_id" {
  description = "Proxmox VM ID"
  type        = number
}

variable "name" {
  description = "VM name"
  type        = string
}

variable "initial_node" {
  description = "Proxmox node where the VM currently runs (import/bootstrap only; placement drift is ignored)"
  type        = string
}

variable "mac_address" {
  description = "MAC address for the primary network interface"
  type        = string
}

# -----------------------------------------------------------------------------
# Compute and Memory
# -----------------------------------------------------------------------------

variable "cores" {
  description = "CPU cores per socket"
  type        = number
  default     = 2
}

variable "sockets" {
  description = "Number of CPU sockets"
  type        = number
  default     = 1
}

variable "cpu_type" {
  description = "Emulated CPU type"
  type        = string
  default     = "host"
}

variable "memory" {
  description = "Dedicated memory in MB"
  type        = number
}

variable "memory_floating" {
  description = "Balloon target in MB; set to 0 to disable ballooning"
  type        = number
  default     = 0
}

# -----------------------------------------------------------------------------
# Storage
# -----------------------------------------------------------------------------

variable "disk_size" {
  description = "Primary disk size in GB"
  type        = number
}

variable "storage_pool" {
  description = "Proxmox storage pool for VM disks"
  type        = string
  default     = "zfs"
}

variable "disk_cache" {
  description = "Disk cache mode"
  type        = string
  default     = "none"
}

variable "disk_discard" {
  description = "Enable TRIM/discard on the primary disk"
  type        = bool
  default     = false
}

variable "disk_iothread" {
  description = "Enable iothread on the primary disk"
  type        = bool
  default     = false
}

variable "disk_ssd" {
  description = "Report primary disk as SSD to the guest"
  type        = bool
  default     = false
}

variable "scsi_hardware" {
  description = "SCSI controller type"
  type        = string
  default     = "virtio-scsi-single"
}

variable "bios" {
  description = "BIOS implementation (seabios or ovmf)"
  type        = string
  default     = "seabios"

  validation {
    condition     = contains(["seabios", "ovmf"], var.bios)
    error_message = "bios must be seabios or ovmf."
  }
}

variable "efi_datastore_id" {
  description = "Datastore for the EFI disk when bios is ovmf (defaults to storage_pool)"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Boot and Devices
# -----------------------------------------------------------------------------

variable "boot_order" {
  description = "Boot device order"
  type        = list(string)
}

variable "cdrom_enabled" {
  description = "Attach an empty CD-ROM drive at ide2"
  type        = bool
  default     = false
}

variable "tablet_device" {
  description = "Enable USB tablet device"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Network and Behavior
# -----------------------------------------------------------------------------

variable "network_bridge" {
  description = "Network bridge for the primary interface"
  type        = string
  default     = "vmbr1"
}

variable "firewall" {
  description = "Enable Proxmox firewall on the primary interface"
  type        = bool
  default     = false
}

variable "additional_network_devices" {
  description = "Extra network interfaces after the primary (net1, net2, ...)"
  type = list(object({
    bridge      = string
    mac_address = string
    vlan_id     = optional(number)
    firewall    = optional(bool, false)
  }))
  default = []
}

variable "on_boot" {
  description = "Start VM on host boot"
  type        = bool
  default     = true
}

variable "protection" {
  description = "Prevent accidental VM/disk removal in Proxmox"
  type        = bool
  default     = true
}

variable "qemu_agent" {
  description = "Enable QEMU guest agent"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Proxmox VM tags"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# High Availability
# -----------------------------------------------------------------------------

variable "ha" {
  description = "Proxmox HA membership (single instance, cluster-managed placement)"
  type = object({
    enabled      = bool
    group        = optional(string)
    state        = optional(string, "started")
    max_restart  = optional(number, 1)
    max_relocate = optional(number, 1)
  })
  default = {
    enabled = false
  }

  validation {
    condition     = !var.ha.enabled || (try(var.ha.group, null) != null && var.ha.group != "")
    error_message = "ha.group is required when ha.enabled is true."
  }
}
