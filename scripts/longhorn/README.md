# Longhorn Management Scripts

This directory contains utility scripts for managing Longhorn volumes and addressing common operational issues.

> **Navigation**: [← Home](../../README.md)

## Scripts Overview

### `fix-disk-uuid-mismatch.sh`

Helps recover from `DiskFilesystemChanged` / `record diskUUID doesn't match` (common after Talos EPHEMERAL wipe). Longhorn **blocks** removing a disk from `nodes.longhorn.io` until replicas are gone, so the script is split into **prepare** (disable scheduling + request eviction), **finish** (remove + re-add the same path so Longhorn records the new filesystem UUID), plus **rescan** and **status**.

**Usage:**

```bash
./fix-disk-uuid-mismatch.sh rescan
./fix-disk-uuid-mismatch.sh status
./fix-disk-uuid-mismatch.sh prepare talos-01 talos-02
# wait until each node shows 0 replicas in status
./fix-disk-uuid-mismatch.sh finish talos-01 talos-02
DRY_RUN=1 ./fix-disk-uuid-mismatch.sh finish talos-03
LONGHORN_DISK_KEY=my-disk ./fix-disk-uuid-mismatch.sh finish talos-03
```

Disk selection: by default the script picks a disk whose `path` contains `longhorn`, otherwise the first disk key alphabetically. Override with `LONGHORN_DISK_KEY`.

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

Updates existing volumes to match the configured replica count (**2** by default in the Longhorn HelmRelease and generic-app Longhorn defaults; override with `NEW_REPLICA_COUNT` or `./update-volume-replica-counts.sh 1`). Longhorn adds or removes replicas after the patch; raising count uses more disk and rebuild bandwidth; lowering frees space once extras drain.

**Usage:**

```bash
./update-volume-replica-counts.sh
```

### `catalog-stuck-pods-and-volumes.sh`

Prints a TSV of non-ready pods (Pending, CrashLoopBackOff, stuck init, etc.), their PVCs, Longhorn volume `state` / `robustness` / `dataLocality`, and the primary replica’s node and `currentState` / `desireState` / `hardNodeAffinity`. Use after incidents to see whether the blocker is scheduling, locality, or Longhorn health.

**Usage:**

```bash
./catalog-stuck-pods-and-volumes.sh | tee /tmp/stuck-catalog.tsv
```

### `bulk-restore-from-backup.sh`

Linear flow: consider each **candidate** Longhorn volume (see **`CANDIDATE_FILTER`**), confirm **`status.lastBackup`** resolves to a **Backup** CR with **`status.url`**, **delete PVC** then **delete Volume**, wait for the PVC to return, **patch** the new volume **`spec.fromBackup`**. Subcommands: **`list`** (same candidate filter as restore), **`restore`** (destructive).

**`CANDIDATE_FILTER`:** **`workload-blocked`** (default) = **`robustness`** **faulted** or **degraded**, **or** **`Ready`** condition **`False`** (matches UI “not ready for workload” in many cases), **or** **`spec.fromBackup`** set, **or** **`Restore`** condition **`True`**. **`unhealthy`** = faulted + degraded only (stricter). **`faulted`** = faulted only.

Have **schedulable Longhorn disks** before bulk restore. **Scale down workloads** (or otherwise release the PVC) before **`restore`**; PVC delete hangs if a pod still mounts it. The script skips volumes that still have pods using the PVC unless **`SKIP_PREFLIGHT=1`**.

After PVC delete, **Flux** (or whatever owns the claim) recreates the PVC on its normal interval — the script **does not** call **`flux reconcile`** or annotate HelmReleases; it only **waits** up to **`RECREATE_PVC_WAIT_SEC`** for the PVC to exist again.

**Usage:**

```bash
./bulk-restore-from-backup.sh list
DRY_RUN=1 ./bulk-restore-from-backup.sh restore
CANDIDATE_FILTER=unhealthy MAX_VOLUMES=3 I_AM_SURE=yes ./bulk-restore-from-backup.sh restore
I_AM_SURE=yes ./bulk-restore-from-backup.sh restore
```

Long runs: redirect to a log and **`tail -f`**; output may be block-buffered when not a TTY.

**PVC wait:** uses **`kubectl wait --for=jsonpath='{.status.phase}'=Bound`** (not **`condition=Bound`**) so claims without **`status.conditions`** do not hang.

**Per-volume failures:** timeouts, missing PVC, or failed patch **log and continue**. **`SKIP_VOLUMES=vol1,vol2`** skips by Longhorn volume name.

### `update-volume-data-locality.sh`

Patches existing volumes to `dataLocality: best-effort` by default (matches the Longhorn HelmRelease). Lets Kubernetes schedule the workload without requiring a local replica on the same node—useful after node chaos or faulted strict-local volumes.

Longhorn does **not** allow converting between `strict-local` and other locality modes while the volume is **attached**. Detach first (scale down workloads), then run the script. To push `strict-local` again: `NEW_LOCALITY=strict-local ./update-volume-data-locality.sh`.

**Usage:**

```bash
./update-volume-data-locality.sh
NEW_LOCALITY=strict-local ./update-volume-data-locality.sh
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

### `cleanup-stopped-replicas.sh`

Cleans up stopped Longhorn replicas that have hit the rebuild retry limit. These replicas consume disk space but are not active and safe to delete as long as the volume has sufficient healthy replicas on other nodes. The script verifies each volume has enough running replicas before deletion.

**Usage:**

```bash
# Clean up stopped replicas on a specific node
./cleanup-stopped-replicas.sh <node-name>

# Clean up stopped replicas on all nodes
./cleanup-stopped-replicas.sh
```

### `cancel-stuck-restores.sh`

Cancels stuck Longhorn volume restores triggered by the pasture-operator. Clears the `fromBackup` field from volumes stuck in restore state and sets the `pasture.longhorn.io/status` annotation to `error`. Only processes volumes that are in error state or have been stuck for more than 30 minutes.

**Usage:**

```bash
./cancel-stuck-restores.sh
```

### `clear-engine-restores.sh`

Clears `requestedBackupRestore` from Longhorn engines stuck in restore state. This allows engines to stop trying to restore from empty backups. Finds engines for volumes with `restoreRequired=true` and clears the restore request.

**Usage:**

```bash
./clear-engine-restores.sh
```

### `clear-restore-conditions.sh`

Clears the Restore condition from Longhorn volumes stuck with `RestoreInProgress` status. This allows Longhorn to properly reconcile and recognize existing replicas. Updates the Restore condition to `False` with reason `RestoreCancelled`.

**Usage:**

```bash
./clear-restore-conditions.sh
```

### `clear-volume-restore-status.sh`

Clears `restoreRequired` and `restoreInitiated` from Longhorn volume status using server-side apply with force conflicts. This forces Longhorn to stop treating volumes as being restored and allows normal operation. Volumes will then be able to start replicas normally.

**Usage:**

```bash
./clear-volume-restore-status.sh
```

### `reset-stopped-replicas.sh`

Resets `rebuildRetryCount` to 0 for stopped Longhorn replicas that have a retry count greater than 0. This allows Longhorn to retry starting these replicas instead of leaving them stuck. Useful after node reboots or restore failures when replicas are stuck in stopped state.

**Usage:**

```bash
# Reset stopped replicas on a specific node
./reset-stopped-replicas.sh <node-name>

# Reset stopped replicas on all nodes
./reset-stopped-replicas.sh
```

### `restart-degraded-volume-engines.sh`

Restarts engines for degraded volumes to force Longhorn reconciliation. This helps volumes stuck with null `replicaDirectoryMap` to properly update status and recognize existing replicas. Deletes engines (Longhorn will recreate them) for all degraded attached volumes.

**Usage:**

```bash
./restart-degraded-volume-engines.sh
```

**Warning:** This will briefly interrupt I/O for affected volumes during engine restart (typically 10-30 seconds per volume).

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

**Why naive remove fails:** The API returns _disable the disk and remove all replicas and backing images first_. You must **evacuate replicas** off that disk before Longhorn will let you remove its spec entry.

**Order of operations:**

1. **Optional:** `./fix-disk-uuid-mismatch.sh rescan` — sets `longhorn.io/force-disk-rescan` / `force-sync` on every `nodes.longhorn.io` (sometimes enough if metadata was only stale).
2. **Check:** `./fix-disk-uuid-mismatch.sh status` — confirms whether **any** disk is `Schedulable` and shows replica counts per node.
3. **Prepare:** `./fix-disk-uuid-mismatch.sh prepare NODE ...` — `allowScheduling: false` and `evictionRequested: true` on the chosen disk so replicas can move elsewhere.
4. **Wait** until `status` shows **zero replicas** on each node you will `finish` (watch `kubectl get replicas.longhorn.io -n longhorn-system` if needed).
5. **Finish:** `./fix-disk-uuid-mismatch.sh finish NODE ...` — JSON remove that disk key from `spec.disks`, wait, then merge the same disk config back so Longhorn records the **current** filesystem UUID.

**Cluster-wide deadlock:** If **no** disk in the cluster is schedulable, eviction has nowhere to land; replica counts never drop and `finish` will keep refusing. Escape paths include: add a **second** Longhorn disk on one or more nodes (new path + fresh filesystem, schedulable), then run `prepare` on the broken disks so eviction targets the healthy path; restore from **Longhorn backups**; or follow Longhorn’s [orphaned replica recovery](https://longhorn.io/kb/restoring-data-from-an-orphaned-replica-directory/) if you are deliberately recovering data outside normal scheduling — understand data risk before deleting replica CRs.

**UI equivalent:** Disable scheduling and request eviction on the disk, wait for replicas to drain, then delete the disk from the node and re-add the same path and settings.

After disks are **Ready** and **Schedulable**, retry **Salvage** on faulted volumes and let workloads attach again.

### Data Locality Not Applied to Existing Volumes

**Problem:** `defaultDataLocality` in the HelmRelease does not retroactively change existing `Volume` CRs (for example after switching defaults to `best-effort`).

**Root Cause:** Global defaults apply to new volumes; existing volumes keep their prior `spec.dataLocality`.

**Solution:**

- Detach volumes (scale down consumers), run `update-volume-data-locality.sh`, then scale back up
- Or leave existing volumes as-is; new PVCs inherit `best-effort` from defaults

### Replica Count Mismatch

**Problem:** `defaultReplicaCount` / StorageClass replica defaults changed in Git, but existing volumes still use the old `spec.numberOfReplicas`.

**Root Cause:** Global defaults apply to new volumes only.

**Solution:**

- Use `update-volume-replica-counts.sh` to patch existing volumes (default target **2**, aligned with the HelmRelease and generic-app Longhorn template defaults)
- Longhorn removes surplus replicas after the patch, which recovers space

### Snapshot Limits Not Applied Retroactively

**Problem:** Changed `snapshotMaxCount` from 250 to 5, but existing volumes still have the old limit.

**Root Cause:** The global setting only applies to new volumes.

**Solution:**

- Use `update-volume-snapshot-limits.sh` to patch existing volumes
- **Note:** Cannot reduce limit below current snapshot count - clean up snapshots first if needed

### Stopped Replicas Consuming Disk Space

**Problem:** Nodes showing excessive disk usage with many stopped Longhorn replicas, even though volumes are configured for the expected replica count.

**Root Causes:**

- Replicas failing to start on a node (e.g., due to disk pressure) and hitting the rebuild retry limit (5)
- Longhorn creates new replicas on other nodes but doesn't automatically clean up failed replicas
- Stopped replicas still consume disk space even though they're not active
- Can accumulate hundreds of GB of wasted space on affected nodes

**Symptoms:**

- Node disk usage much higher than expected
- Many replicas in "stopped" state on a specific node
- Replicas showing `rebuildRetryCount: 5` and `currentState: stopped`
- Volumes have correct number of running replicas on other nodes

**Solutions:**

1. **Immediate cleanup:** Use `cleanup-stopped-replicas.sh` to remove stopped replicas
2. **Prevention:** Address underlying disk pressure issues on the affected node
3. **Node scheduling:** Consider disabling Longhorn scheduling on nodes that consistently fail to start replicas

### Stuck Volume Restores

**Problem:** Volumes stuck in degraded state after node upgrades or reboots, with restore operations that failed or never completed. Volumes show `restoreRequired=true`, `restoreInitiated=true`, or have Restore conditions stuck in `RestoreInProgress` state.

**Root Causes:**

- pasture-operator attempting to restore volumes from empty backups
- Restore operations timing out or failing but not clearing their state
- Engines stuck with `requestedBackupRestore` set even after restore failure
- Volume status fields not being cleared by Longhorn after restore cancellation
- Restore conditions not being updated when restores fail

**Symptoms:**

- Volumes stuck in degraded state with 0 ready replicas
- Volumes have `restoreRequired=true` and `restoreInitiated=true` in status
- Engines have `requestedBackupRestore` set in spec
- Restore condition shows `status: True, reason: RestoreInProgress`
- Logs show "backup volume is empty for backup restoration"
- Volumes have running replicas but `replicaDirectoryMap` is null

**Solutions:**

1. **Clear engine restore requests:** Use `clear-engine-restores.sh` to clear `requestedBackupRestore` from engines
2. **Clear volume restore status:** Use `clear-volume-restore-status.sh` to clear `restoreRequired` and `restoreInitiated` flags
3. **Clear restore conditions:** Use `clear-restore-conditions.sh` to clear stuck Restore conditions
4. **Reset stopped replicas:** Use `reset-stopped-replicas.sh` if replicas are stuck in stopped state
5. **Restart engines:** Use `restart-degraded-volume-engines.sh` to force reconciliation if volumes still show null `replicaDirectoryMap`
6. **Cancel stuck restores:** Use `cancel-stuck-restores.sh` to clear `fromBackup` field from volumes stuck in restore state

**Recovery Sequence:**

When volumes are stuck after restore failures, run scripts in this order:

1. `clear-engine-restores.sh` - Stop engines from trying to restore
2. `clear-volume-restore-status.sh` - Clear restore flags from volumes
3. `clear-restore-conditions.sh` - Clear stuck Restore conditions
4. `reset-stopped-replicas.sh` - Reset retry counts for stopped replicas
5. `restart-degraded-volume-engines.sh` - Force reconciliation if volumes still stuck

**Prevention:**

- pasture-operator has been updated to prevent restoring existing volumes
- Safeguards added to skip restore for volumes that already have replicas or are in healthy/degraded state

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

Key values in the Longhorn HelmRelease (see `flux/manifests/02-infrastructure/longhorn/helmrelease.yaml`):

- `snapshotMaxCount: "5"` (down from Longhorn’s stock default)
- `defaultReplicaCount: "2"` and `defaultClassReplicaCount: 2` (two replicas by default for HA; override per app/volume when space matters more)
- `defaultDataLocality: "best-effort"` (and matching `persistence.defaultDataLocality`)
- `replicaAutoBalance: "best-effort"`

## Best Practices

1. **Regular Monitoring:** Check for snapshot accumulation and disk pressure regularly
2. **Proactive Cleanup:** Run snapshot cleanup scripts before issues become critical
3. **Configuration Updates:** When changing global settings, use scripts to update existing volumes
4. **Node Maintenance:** Use `cleanup-talos-ephemeral.sh` for Talos nodes before they hit disk pressure
5. **Volume Labels:** Ensure volumes have proper recurring job labels for automated cleanup
6. **Replica Cleanup:** Monitor for stopped replicas and clean them up periodically to free disk space
7. **Post-Upgrade Recovery:** After node upgrades, monitor for stuck restore operations and use recovery scripts if needed

## Troubleshooting

### Scripts Timing Out

If `kubectl patch` commands timeout:

- Volumes may be busy with I/O operations
- Scripts include timeout handling
- Check if patches actually succeeded despite timeout errors
- Scripts verify patches by checking the actual volume state

### Data Locality Patches Not Sticking

If `update-volume-data-locality.sh` fails with invalid request / locality conversion errors:

- Longhorn requires the volume **detached** to switch between `strict-local` and `best-effort` (or `disabled`)
- Scale down the workload using the volume, confirm `status.state` is detached on the `Volume`, rerun the script

### Snapshot Limits Can't Be Reduced

If `update-volume-snapshot-limits.sh` skips volumes:

- Current snapshot count exceeds the new limit
- Clean up snapshots first using `cleanup-longhorn-snapshots.sh`
- Then retry the limit update
