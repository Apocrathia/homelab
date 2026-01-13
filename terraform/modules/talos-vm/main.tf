# -----------------------------------------------------------------------------
# Talos VM Module
# -----------------------------------------------------------------------------
# Creates a Proxmox VM configured for Talos Linux.
# Designed for importing existing VMs - matches current production config.

resource "proxmox_virtual_environment_vm" "this" {
  vm_id     = var.vm_id
  name      = var.name
  node_name = var.proxmox_node

  # VM behavior
  on_boot    = var.onboot
  protection = var.protection
  started    = true

  # CPU configuration
  cpu {
    cores   = var.cores
    sockets = var.sockets
    type    = var.cpu_type
  }

  # Memory configuration (balloon disabled for Kubernetes)
  memory {
    dedicated = var.memory
    floating  = 0 # Disable ballooning
  }

  # Primary disk
  disk {
    datastore_id = var.storage_pool
    interface    = "scsi0"
    size         = var.disk_size
    cache        = "none"
    discard      = "on"
    iothread     = true
    ssd          = true
  }

  # SCSI controller
  scsi_hardware = "virtio-scsi-single"

  # CD-ROM (empty, for Talos ISO if needed)
  cdrom {
    file_id   = "none"
    interface = "ide2"
  }

  # Network interface
  network_device {
    bridge      = var.network_bridge
    model       = "virtio"
    mac_address = var.mac_address
    firewall    = var.firewall
  }

  # Boot order
  boot_order = ["scsi0", "ide2", "net0"]

  # QEMU guest agent
  agent {
    enabled = var.qemu_agent
  }

  # Operating system type (Linux 2.6+)
  operating_system {
    type = "l26"
  }

  # Tags
  tags = var.tags

  # Lifecycle - ignore changes that Proxmox may modify
  lifecycle {
    ignore_changes = [
      # Proxmox regenerates these
      disk[0].file_id,
      # SMBIOS UUID is auto-generated
      machine,
      # QEMU agent reports these dynamically
      ipv4_addresses,
      ipv6_addresses,
    ]
  }
}
