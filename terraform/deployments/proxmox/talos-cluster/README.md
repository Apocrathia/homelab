# talos-cluster — shared Talos VM inputs

`common.hcl` holds the inputs every Talos VM inherits: 4x4 host CPU, 64 GB
memory without ballooning, a 1 TB zfs disk, the vmbr1 bridge, and the
onboot/protection flags. Per-VM values live in the talos-01…04 directories.

> **Navigation**: [← Back to proxmox — Proxmox deployment](../README.md)
