# -----------------------------------------------------------------------------
# Game VM
# -----------------------------------------------------------------------------

include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../modules/proxmox-vm"
}

inputs = {
  vm_id        = 103
  name         = "Game"
  initial_node = "node-03"
  mac_address  = "BC:24:11:BA:C7:E5"

  cores           = 2
  sockets         = 2
  cpu_type        = "x86-64-v2-AES"
  memory          = 32768
  memory_floating = 16384

  disk_size     = 128
  storage_pool  = "zfs"
  disk_iothread = true
  scsi_hardware = "virtio-scsi-single"

  boot_order     = ["scsi0", "ide2", "net0"]
  cdrom_enabled  = true
  network_bridge = "vmbr1"
  firewall       = true

  on_boot    = true
  protection = true
  qemu_agent = true

  tags = ["gaming"]
}
