# Backup

Cluster backup plane built on [kopiur](../02-infrastructure/kopiur/README.md)
(Kopia-native operator): a shared `ClusterRepository` on the NAS RustFS
S3-compatible object store, plus per-workload `SnapshotPolicy` /
`SnapshotSchedule` pairs. Intended to replace Longhorn's recurring CIFS backup
jobs for cluster volumes; Longhorn stays for replication and volume storage.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

- `secret.yaml` — materializes `kopiur-secrets` (RustFS S3 keys +
  `KOPIA_PASSWORD` repo-encryption passphrase) into `kopiur-system`. The S3 key
  is bucket-scoped: policy `kopia` on the RustFS instance grants
  read/write/list/delete on the `kopia` bucket only (cross-bucket access and
  bucket creation return 403; verified 2026-09-11)
- `clusterrepository.yaml` — `ClusterRepository/nas-rustfs`: kopia repository
  in the `kopia` bucket at `storage.services.apocrathia.com:9009`
  (plain HTTP, path-style), tenancy-gated by `allowedNamespaces`, credential
  projection enabled, maintenance default-managed in `kopiur-system`
- `pilot-*.yaml` — pilot SnapshotPolicies + nightly schedules
  (0200 UTC ± 30m jitter, keepDaily 7 / keepWeekly 4) on three non-critical
  Longhorn PVCs

## Status: pilot

Three low-stakes PVCs (`demo-app`, `changedetection-io`, `huntarr2`), running
in parallel with Longhorn's `daily-backup` RecurringJob. Expand
`allowedNamespaces` + add policy files to widen coverage; retire the Longhorn
backup job once restores have been drilled and the pilot has soaked.

Kopia encrypts, compresses, and deduplicates client-side before upload, so
the RustFS bucket and any future cloud replica hold ciphertext only.

`features.credentialProjection.enabled` on the operator grants cluster-wide
`secrets` create/patch/delete RBAC (Kubernetes cannot scope `create` to a
Secret name). Gates: the repository owner must set `credentialProjection.allowed`,
each consumer opts in per policy, and `allowedNamespaces` limits tenants.

## Configuration

- Repository backend details live in `clusterrepository.yaml`
- Credentials: 1Password item `vaults/Secrets/items/kopiur-secrets`
- `KOPIA_PASSWORD` is the repository encryption passphrase — losing it makes
  the repository unrecoverable (there is no reset)

## Usage

```bash
kubectl get clusterrepository nas-rustfs -o wide
kubectl get snapshots -A
kubectl wait --for=condition=Ready clusterrepository/nas-rustfs --timeout=120s
```

- **Kopiur docs**: <https://kopiur.home-operations.com/>
- **Restore drills**: <https://kopiur.home-operations.com/docs/scenarios/verification-drills/>
