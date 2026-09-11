# Kopiur

[Kopia](https://kopia.io)-native Kubernetes backup operator
([home-operations/kopiur](https://github.com/home-operations/kopiur)), written
in Rust on kube-rs. Pilot deployment — intended to replace Longhorn's
recurring backup jobs for cluster volumes.

> **Navigation**: [← Back to Infrastructure README](../README.md)

## Overview

- Deploys the kopiur controller + admission webhook into `kopiur-system`
  (chart is cosign-signed, images digest-pinned to the release)
- 9 CRDs (`kopiur.home-operations.com/v1alpha1`): `Repository`,
  `ClusterRepository`, `SnapshotPolicy`, `Snapshot`, `SnapshotSchedule`,
  `Restore`, `Maintenance`, `RepositoryReplication`, `SnapshotReplication`
- Backups run as short-lived mover Jobs in the workload namespace; data is
  chunked, compressed, and encrypted client-side before it reaches the
  repository backend
- Webhook certificate is self-managed (no cert-manager dependency)

## Status: operator only

No `Repository`/`SnapshotPolicy`/`SnapshotSchedule` objects deployed yet — the
backup plane (`ClusterRepository` on NAS RustFS + pilot policies on
non-critical PVCs) lands in a separate follow-up MR under
`03-services/backup`. Longhorn's `daily-backup` RecurringJob stays in place
until the pilot proves out. `features.credentialProjection.enabled` is set so
the follow-up's shared repository can project credentials into mover
namespaces.

kopiur is alpha software (`v1alpha1`, CRD surface may change between
releases) — chart version is pinned and Renovate-managed.

## Configuration

See `helmrelease.yaml`. Chart source: the `home-operations` OCI
HelmRepository (also serves snapshot-controller and tuppr).

## Usage

```bash
kubectl get crd | grep kopiur.home-operations.com
kubectl kopiur status  # krew/homebrew plugin: docs/cli/index.md
```

- **Docs**: <https://kopiur.home-operations.com/>
- **Install guide**: <https://kopiur.home-operations.com/docs/install/>
- **kubectl plugin**: `kubectl krew install --manifest-url https://raw.githubusercontent.com/home-operations/kopiur/main/plugins/kopiur.yaml`
