# Backup

Shared kopia repository for the cluster, built on
[kopiur](../../02-infrastructure/kopiur/README.md) (Kopia-native operator):
one `ClusterRepository` on the NAS RustFS S3-compatible object store.
Backup policies live with their apps, not here.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

- `secret.yaml` — materializes `kopiur-secrets` (RustFS S3 keys +
  `KOPIA_PASSWORD` repo-encryption passphrase) into `kopiur-system`. The S3 key
  is bucket-scoped: policy `kopia` on the RustFS instance grants
  read/write/list/delete on the `kopia` bucket only (cross-bucket access and
  bucket creation return 403; verified 2026-09-11)
- `clusterrepository.yaml` — `ClusterRepository/nas-rustfs`: kopia repository
  in the `kopia` bucket at `storage.services.apocrathia.com:9009`
  (plain HTTP, path-style), CEL identity defaults, maintenance
  default-managed in `kopiur-system`

## How an app opts in

This directory does not change per app. An app backs itself up by:

1. Labeling its namespace (in its own `namespace.yaml`):
   `backup.apocrathia.com/repo: nas-rustfs` — the tenancy gate
2. Adding a `backup.yaml` to its own kustomization with a `SnapshotPolicy`
   (PVC sources, retention) and a `SnapshotSchedule` (cron window)

Pilot apps: `demo-app`, `jellyfin` (config only; media PVCs are NAS-backed).
Longhorn's `daily-backup` RecurringJob stays in place until the pilot proves
out (restore drill + soak).

Kopia encrypts, compresses, and deduplicates client-side before upload, so
the RustFS bucket and any future cloud replica hold ciphertext only.

`features.credentialProjection.enabled` on the operator grants cluster-wide
`secrets` create/patch/delete RBAC (Kubernetes cannot scope `create` to a
Secret name). Gates: the repository owner must set `credentialProjection.allowed`,
each consumer opts in per policy, and `allowedNamespaces` limits tenants.

## Usage

```bash
kubectl get clusterrepository nas-rustfs -o wide
kubectl get snapshots -A
kubectl wait --for=condition=Ready clusterrepository/nas-rustfs --timeout=120s
```

- **Kopiur docs**: <https://kopiur.home-operations.com/>
- **Restore drills**: <https://kopiur.home-operations.com/docs/scenarios/verification-drills/>
