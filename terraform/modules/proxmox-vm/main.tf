# -----------------------------------------------------------------------------
# Proxmox VM Module
# -----------------------------------------------------------------------------
# Cluster-portable VMs: node placement is managed by Proxmox (HA, migration).
# Terraform owns VM config, not which node runs the instance.

resource "proxmox_virtual_environment_vm" "this" {
  vm_id     = var.vm_id
  name      = var.name
  node_name = var.initial_node

  on_boot       = var.on_boot
  protection    = var.protection
  started       = true
  tablet_device = var.tablet_device
  bios          = var.bios
  scsi_hardware = var.scsi_hardware
  boot_order    = var.boot_order
  tags          = var.tags

  cpu {
    cores   = var.cores
    sockets = var.sockets
    type    = var.cpu_type
  }

  memory {
    dedicated = var.memory
    floating  = var.memory_floating
  }

  disk {
    datastore_id = var.storage_pool
    interface    = "scsi0"
    size         = var.disk_size
    cache        = var.disk_cache
    discard      = var.disk_discard ? "on" : "ignore"
    iothread     = var.disk_iothread
    ssd          = var.disk_ssd
  }

  dynamic "efi_disk" {
    for_each = var.bios == "ovmf" ? [1] : []

    content {
      datastore_id = coalesce(var.efi_datastore_id, var.storage_pool)
      type         = "4m"
    }
  }

  dynamic "cdrom" {
    for_each = var.cdrom_enabled ? [1] : []

    content {
      file_id   = "none"
      interface = "ide2"
    }
  }

  network_device {
    bridge      = var.network_bridge
    model       = "virtio"
    mac_address = var.mac_address
    firewall    = var.firewall
  }

  dynamic "network_device" {
    for_each = var.additional_network_devices

    content {
      bridge      = network_device.value.bridge
      model       = "virtio"
      mac_address = network_device.value.mac_address
      vlan_id     = network_device.value.vlan_id
      firewall    = network_device.value.firewall
    }
  }

  agent {
    enabled = var.qemu_agent
  }

  operating_system {
    type = "l26"
  }

  lifecycle {
    ignore_changes = [
      node_name,
      disk[0].file_id,
      tags,
    ]
  }
}

resource "proxmox_haresource" "this" {
  count = var.ha.enabled ? 1 : 0

  resource_id  = "vm:${proxmox_virtual_environment_vm.this.vm_id}"
  group        = var.ha.group
  state        = var.ha.state
  max_restart  = var.ha.max_restart
  max_relocate = var.ha.max_relocate
}
