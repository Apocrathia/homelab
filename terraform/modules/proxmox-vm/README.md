# proxmox-vm: cluster-portable VM module

Owns VM configuration only; node placement is Proxmox's business (HA,
migration). `initial_node` matters for import and bootstrap; placement drift
after that is ignored.

> **Navigation**: [← Back to modules: shared OpenTofu modules](../README.md)
