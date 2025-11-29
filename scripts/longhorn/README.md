# Longhorn Management Scripts

This directory contains utility scripts for managing Longhorn volumes and addressing common operational issues.

## Scripts Overview

### `cleanup-longhorn-snapshots.sh`

Comprehensive snapshot cleanup that handles three types of cleanup:

- Old recurring job snapshots beyond retention policy
- Old system-generated snapshots (no RecurringJob label)
- Orphaned snapshots (for deleted volumes)

**Usage:**

```bash
./cleanup-longhorn-snapshots.sh
```

### `update-volume-snapshot-limits.sh`

Updates existing volumes to use the new `snapshotMaxCount` limit. The global setting in HelmRelease only applies to new volumes, so this script retroactively patches existing volumes.

**Usage:**

```bash
./update-volume-snapshot-limits.sh
```

### `update-volume-replica-counts.sh`

Updates existing volumes to reduce replica count (e.g., from 3 to 2). Longhorn will automatically remove the extra replicas after the patch.

**Usage:**

```bash
./update-volume-replica-counts.sh
```

### `update-volume-data-locality.sh`

Updates volumes from `dataLocality: disabled` to `strict-local`. **Note:** Volumes must be detached during the change, which requires scaling down workloads.

**Usage:**

```bash
./update-volume-data-locality.sh
```

### `cleanup-talos-ephemeral.sh`

Cleans up disk space on Talos nodes by wiping the EPHEMERAL partition using `talosctl reset`. This removes container images, logs, and ephemeral data without affecting the STATE partition or cluster membership.

**Usage:**

```bash
./cleanup-talos-ephemeral.sh <node-name>
```

### `cleanup-node-disk-space.sh`

Creates a privileged pod to clean up disk space on a node. Attempts to clean containerd images and logs. **Note:** This may not work if the node is under severe disk pressure and cannot schedule pods.

**Usage:**

```bash
./cleanup-node-disk-space.sh <node-name>
```

## Common Issues and Solutions

### Snapshot Accumulation

**Problem:** Volumes accumulating excessive snapshots (100+), causing:

- Degraded volume state
- "TooManySnapshots" condition
- Scheduling failures
- Disk space exhaustion

**Root Causes:**

- Default `snapshotMaxCount` of 250 is too high
- System-generated snapshots not being cleaned up automatically
- Recurring jobs creating snapshots without proper retention
- Orphaned snapshots from deleted volumes

**Solutions:**

1. **Prevention:** Configured `snapshotMaxCount: "5"` in HelmRelease and added `snapshot-delete` recurring job
2. **Immediate cleanup:** Use `cleanup-longhorn-snapshots.sh` to remove old snapshots
3. **Retroactive updates:** Use `update-volume-snapshot-limits.sh` to patch existing volumes

### Disk Pressure on Nodes

**Problem:** Nodes running out of disk space, causing:

- Pod evictions
- Unschedulable nodes
- Longhorn components unable to start
- Instance Manager failures

**Root Causes:**

- Accumulated container images
- Old kubelet logs
- Longhorn snapshots and replicas
- EPHEMERAL partition filling up on Talos nodes

**Solutions:**

1. **Talos nodes:** Use `cleanup-talos-ephemeral.sh` to wipe EPHEMERAL partition (safest and most effective)
2. **Generic cleanup:** Use `cleanup-node-disk-space.sh` for containerd image and log cleanup
3. **Longhorn cleanup:** Use snapshot cleanup scripts to free space from Longhorn data

### Disk UUID Mismatch After EPHEMERAL Wipe

**Problem:** After wiping EPHEMERAL partition on Talos, Longhorn reports:

- `DiskFilesystemChanged` condition
- `record diskUUID doesn't match the one on the disk`
- Disk marked as not ready and not schedulable

**Solution:**

1. Delete the disk configuration in Longhorn UI
2. Re-add the disk with the same path and settings
3. Longhorn will re-detect the new UUID and accept it

### Data Locality Not Applied to Existing Volumes

**Problem:** Changed `defaultDataLocality` to `strict-local` in HelmRelease, but existing volumes still have `dataLocality: disabled`.

**Root Cause:** The global setting only applies to new volumes created after the change.

**Solution:**

- Use `update-volume-data-locality.sh` to patch existing volumes
- **Note:** Requires volumes to be detached, which means scaling down workloads
- New volumes will automatically get `strict-local` from the StorageClass

### Replica Count Mismatch

**Problem:** Changed `defaultReplicaCount` from 3 to 2, but existing volumes still have 3 replicas.

**Root Cause:** The global setting only applies to new volumes.

**Solution:**

- Use `update-volume-replica-counts.sh` to patch existing volumes
- Longhorn will automatically remove the extra replica after the patch

### Snapshot Limits Not Applied Retroactively

**Problem:** Changed `snapshotMaxCount` from 250 to 5, but existing volumes still have the old limit.

**Root Cause:** The global setting only applies to new volumes.

**Solution:**

- Use `update-volume-snapshot-limits.sh` to patch existing volumes
- **Note:** Cannot reduce limit below current snapshot count - clean up snapshots first if needed

## Configuration Changes

### Recurring Jobs

Added `snapshot-delete` recurring job that:

- Runs every 6 hours
- Keeps only the 5 most recent snapshots
- Applies to all volumes in the `default` group

### StorageClass Configuration

Added `recurringJobSelector` to automatically label new volumes:

- New volumes get `recurring-job.longhorn.io/snapshot-delete: enabled` automatically
- Ensures all new volumes are included in snapshot cleanup

### Default Settings

Key changes in HelmRelease:

- `snapshotMaxCount: "5"` (down from 250)
- `defaultReplicaCount: "2"` (down from 3)
- `defaultDataLocality: "strict-local"` (replicas on same node as pod)
- `replicaAutoBalance: "best-effort"` (automatic rebalancing)

## Best Practices

1. **Regular Monitoring:** Check for snapshot accumulation and disk pressure regularly
2. **Proactive Cleanup:** Run snapshot cleanup scripts before issues become critical
3. **Configuration Updates:** When changing global settings, use scripts to update existing volumes
4. **Node Maintenance:** Use `cleanup-talos-ephemeral.sh` for Talos nodes before they hit disk pressure
5. **Volume Labels:** Ensure volumes have proper recurring job labels for automated cleanup

## Troubleshooting

### Scripts Timing Out

If `kubectl patch` commands timeout:

- Volumes may be busy with I/O operations
- Scripts include timeout handling
- Check if patches actually succeeded despite timeout errors
- Scripts verify patches by checking the actual volume state

### Volumes Can't Be Detached

If `update-volume-data-locality.sh` skips volumes:

- Volumes are attached to running pods
- Scale down the workload first, then run the script
- Or manually detach volumes in Longhorn UI

### Snapshot Limits Can't Be Reduced

If `update-volume-snapshot-limits.sh` skips volumes:

- Current snapshot count exceeds the new limit
- Clean up snapshots first using `cleanup-longhorn-snapshots.sh`
- Then retry the limit update
