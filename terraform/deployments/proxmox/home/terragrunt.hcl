# -----------------------------------------------------------------------------
# Home VM (Home Assistant OS)
# -----------------------------------------------------------------------------

include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../modules/proxmox-vm"
}

inputs = {
  vm_id        = 100
  name         = "Home"
  initial_node = "node-02"
  mac_address  = "02:76:64:D6:54:98"

  cores           = 4
  cpu_type        = "host"
  memory          = 32768
  memory_floating = 8192

  disk_size     = 128
  storage_pool  = "zfs"
  disk_cache    = "writethrough"
  disk_discard  = true
  disk_ssd      = true
  scsi_hardware = "virtio-scsi-pci"
  bios          = "ovmf"

  boot_order     = ["scsi0"]
  cdrom_enabled  = false
  tablet_device  = false
  network_bridge = "vmbr1"
  firewall       = false

  on_boot    = true
  protection = true
  qemu_agent = true

  tags = ["homeassistant"]

  ha = {
    enabled      = true
    group        = "Primary"
    state        = "started"
    max_restart  = 10
    max_relocate = 10
  }
}
