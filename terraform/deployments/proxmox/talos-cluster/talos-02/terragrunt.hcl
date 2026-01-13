# -----------------------------------------------------------------------------
# Talos-02 VM Configuration
# -----------------------------------------------------------------------------

# Include root config (backend + provider)
include "root" {
  path = find_in_parent_folders("root.hcl")
}

# Read common inputs
locals {
  common = read_terragrunt_config("${get_terragrunt_dir()}/../common.hcl")
}

# Module source
terraform {
  source = "../../../../modules/talos-vm"
}

# Merge common inputs with per-VM inputs
inputs = merge(
  local.common.inputs,
  {
    vm_id        = 802
    name         = "Talos-02"
    proxmox_node = "node-02"
    mac_address  = "BC:24:11:8C:EB:0B"
  }
)
