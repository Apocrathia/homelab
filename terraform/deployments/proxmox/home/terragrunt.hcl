# -----------------------------------------------------------------------------
# Home VM (Home Assistant OS)
# -----------------------------------------------------------------------------
# Auth (1Password Connect — no PROXMOX_VE_API_TOKEN in env):
#   OP_CONNECT_HOST / OP_CONNECT_TOKEN + TF_HTTP_*
#   Item: proxmox-terraform-secrets (credential field)

include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "provider" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/providers/proxmox.hcl"
}

terraform {
  source = "../../../modules/proxmox-vm"
}

inputs = {
  onepassword_vault_name               = "Secrets"
  onepassword_proxmox_token_item_title = "proxmox-terraform-secrets"

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

  additional_network_devices = [
    {
      bridge      = "vmbr1"
      mac_address = "BC:24:11:A9:63:47"
      vlan_id     = 42
    }
  ]

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
