# Longhorn

Distributed block storage for Kubernetes with replication, snapshots, and backup.

> **Navigation**: [← Back to Infrastructure README](../README.md)

## Overview

Longhorn provides persistent storage with:

- Replicated block storage across cluster nodes
- Automated backup to S3-compatible storage (rustfs on the NAS)
- Point-in-time snapshots
- Dynamic provisioning and online expansion

## Access

- **Web UI**: `https://longhorn.gateway.services.apocrathia.com`
- **Authentication**: Authentik SSO — owned by the `crossplane.yaml` + `authentik.tf` file pair in this directory (the retired blueprint's objects, adopted in place)

## Configuration

See `helmrelease.yaml` for storage settings including replica count, data locality, and retention policies.

### 1Password Setup

`longhorn-backup-target-secret` (OnePasswordItem in `secret.yaml`) holds the
backup-target credentials. Field names are fixed UPPER_CASE keys — longhorn
reads them directly and cannot remap them (rationale in the CIFS → S3
migration note below):

- `AWS_ACCESS_KEY_ID` — S3 access key
- `AWS_SECRET_ACCESS_KEY` — S3 secret key
- `AWS_ENDPOINTS` — S3 endpoint

Values live in the vault item, not in docs.

## Storage Class

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: example-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 10Gi
```

## Backup

- **Target**: S3 on the NAS rustfs; target URL and credential wiring live in `helmrelease.yaml` (see the CIFS → S3 migration note below)
- **Schedule**: Recurring jobs configured in `recurringjobs.yaml`
- **Retention**: Configurable per backup job

```bash
# List volumes
kubectl get volumes -n longhorn-system

# List backups
kubectl get backups -n longhorn-system

# Check backup target
kubectl get backuptargets -n longhorn-system
```

### Orphan BackupVolume prune

Longhorn v1.13.0 never garbage-collects `BackupVolume` CRs for deleted
volumes — over ~1 year 347 orphans accumulated (74% of all CRs), and each one
costs the backup-target sync a mount/ls/umount subprocess chain on **every**
poll pass.

The `longhorn-backup-volume-prune` CronJob (`prune-cronjob.yaml`) runs
`backup-volume-prune.sh` (mounted from the generated `backup-volume-prune`
ConfigMap) on its configured schedule and cross-checks BackupVolume
base names (strip the trailing `-<8 hex>` hash) against live volumes:

- **dry-run** (shipped default): logs the orphans only.
- **delete** (`PRUNE_MODE=delete` in `prune-cronjob.yaml`): deletes orphan
  BackupVolume CRs through longhorn's own deletion flow, which **also removes
  the target-side data**, so the orphan cannot be re-synced back. Deleting the
  CR alone (via the `longhorn.io/delete-custom-resource-only` label) leaves
  the target-side data intact and the next target sync re-creates the CR —
  regrowth.
- Orphans whose newest backup is younger than the grace window
  (`PRUNE_GRACE_DAYS` in `prune-cronjob.yaml`) are kept: a post-mortem
  restore window for recently deleted volumes, and cover for in-flight
  backup restores.
- If the backup target is unavailable during a delete pass, longhorn skips
  remote cleanup; the CR comes back on the next sync and the prune retries.

RBAC (`prune-rbac.yaml`) grants only what the cross-check and the deletion
flow need — nothing more.

### CIFS → S3 migration

The backup target moved from the NAS CIFS share to the same box speaking S3
(rustfs). Why: every CIFS probe cost a full SMB mount/ls/umount subprocess
chain — the sync livelock below — while S3 does listing without per-op
mounts. Existing in-cluster rustfs consumers (loki, mimir, tempo, kopia,
tenzir) already use the same endpoint shape.

**Accepted tradeoff (operator, 2026-10-15):** switching targets makes all
CIFS-era backups **invisible to longhorn** — they stop showing in the UI and
cannot be restored from it. The data itself **remains on the NAS** under the
old share until separately cleaned; nothing deletes it. Restore points
rebuild on the new target as the recurring jobs run, with the schedules and
retention configured in `recurringjobs.yaml`. The first sync against the new
target also garbage-collects the stale CIFS-era BackupVolume CRs — they do
not exist on the new store, so longhorn's own
`cleanupBackupVolumeNotExistOnBackupTarget` pass drops them; the prune
CronJob keeps the new target clean from then on.

**Provisioning** (one-time, before the target switch reconciles): follow
[`docs/infrastructure/rustfs-bucket-user-creation.md`](../../../../docs/infrastructure/rustfs-bucket-user-creation.md)
to create the bucket, its access policy, and a scoped access key, then put
the credentials on the existing `longhorn-backup-target-secret` (fields in
the 1Password Setup table above). The item's keys are UPPER_CASE (not the
kebab-case vault convention) on purpose: longhorn v1.13.0 reads the
credential secret directly by fixed key names (`vendor/backupstore/types`)
and cannot remap them the way chart-side consumers remap kebab-case fields
into UPPER_CASE env vars. This matches the same item's existing CIFS wiring.
`VIRTUAL_HOSTED_STYLE` is left unset (rustfs is path-style). The stale CIFS
fields on the item can be dropped once the migration is verified.

### Backup store sync livelock

`helmrelease.yaml` raises `defaultBackupStore.pollInterval` above the chart
default. v1.13.0's backup-target sync
probes **every** BackupVolume against the target per pass — each probe is a
subprocess chain (backup head + ls + umount) doing a full SMB mount against
slow CIFS. With the whole CR set the pass could not drain inside the
chart-default interval, so the gate re-opened immediately and the sync loop
ran continuously: this was the dominant continuous longhorn-manager process
churn (62–88% of node export bytes during the 2026-10-15 flood investigation).
The raised interval gives each pass room to finish; cron driven backups are
unaffected. Orphan pruning shrinks each pass further (~470 → ~120 CRs).

## Troubleshooting

```bash
# Check overall health
kubectl get nodes.longhorn.io -n longhorn-system

# Volume status
kubectl get volumes -n longhorn-system

# Replica status
kubectl get replicas -n longhorn-system

# Manager logs
kubectl logs -n longhorn-system deployment/longhorn-manager

# Check volume details
kubectl describe volume <volume-name> -n longhorn-system
```

### Common Issues

**Volume attachment failures:**

```bash
kubectl describe volume <volume-name> -n longhorn-system
kubectl describe node <node-name>
```

**Backup failures:**

```bash
kubectl get backups -n longhorn-system
kubectl exec -n minio-system deployment/minio -- mc admin info local
```

## References

- **[Longhorn Documentation](https://longhorn.io/docs/)** - Official docs
- **[Backup and Restore](https://longhorn.io/docs/1.6.0/snapshots-and-backups/)** - Backup guide
