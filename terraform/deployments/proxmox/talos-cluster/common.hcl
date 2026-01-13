# -----------------------------------------------------------------------------
# Talos Cluster - Common Configuration
# -----------------------------------------------------------------------------
# Shared inputs inherited by all Talos VMs in this cluster.
# Per-VM values (vmid, name, node, mac) are defined in each VM's terragrunt.hcl.

# Common inputs for all Talos VMs
inputs = {
  # CPU
  cores    = 4
  sockets  = 4
  cpu_type = "host"

  # Memory (64GB, no ballooning for k8s)
  memory = 65536

  # Storage (1TB disk)
  disk_size    = 1024
  storage_pool = "zfs"

  # Network
  network_bridge = "vmbr1"
  firewall       = true

  # VM behavior
  onboot     = true
  protection = true
  qemu_agent = true

  # Tags
  tags = ["talos", "kubernetes"]
}
