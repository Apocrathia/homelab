# ZFS Configuration

Each Proxmox host has a mirrored pair of 2TB NVMe drives. The storage is fast af, but ZFS and etcd don't always play nicely together. To resolve this, we need to make some configuration changes on each host.

## Talos VM zvol sync

Sync needs to be disabled on Talos VM zvols because etcd's fsync-heavy workload causes massive syncq_wait latency without a SLOG. The hosts don't have spare NVMe slots for a dedicated SLOG device.

```bash
# Apply to all 4 Talos VMs - takes effect instantly
zfs set sync=disabled zfs/vm-801-disk-0
zfs set sync=disabled zfs/vm-802-disk-0
zfs set sync=disabled zfs/vm-803-disk-0
zfs set sync=disabled zfs/vm-804-disk-0

# Verify
zfs get sync zfs/vm-801-disk-0 zfs/vm-802-disk-0 zfs/vm-803-disk-0 zfs/vm-804-disk-0
```

That command will partially fail on each host because each disk is on a different host, but it's just easier to run it on all at once and only document the one block of commands.

> But what about data loss if the host goes down?

All hosts are on UPS and nightly backups run, so the data loss window on unclean shutdown is acceptable. It's not like we're running a business here. What's the point of a homelab if we can't break things?
