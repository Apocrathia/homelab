# Kopiur

[Kopia](https://kopia.io)-native Kubernetes backup operator
([home-operations/kopiur](https://github.com/home-operations/kopiur)), written
in Rust on kube-rs. Intended to replace Longhorn's recurring backup jobs for
cluster volumes (pilot in flight — see Status).

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

## Status

The backup plane landed in
[`03-services/backup`](../../03-services/backup/README.md): the
`ClusterRepository` on NAS RustFS plus per-app `SnapshotPolicy`/`SnapshotSchedule`
objects that live with their apps. Pilot apps: `demo-app`, `jellyfin`
(config only; media PVCs are NAS-backed). Longhorn's `daily-backup`
RecurringJob stays in place until the pilot proves out (restore drill +
soak). `features.credentialProjection.enabled` lets the shared repository
project credentials into mover namespaces.

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

- [Kopiur docs](https://kopiur.home-operations.com/)
- [Install guide](https://kopiur.home-operations.com/docs/install/)
- **kubectl plugin**: `kubectl krew install --manifest-url https://raw.githubusercontent.com/home-operations/kopiur/main/plugins/kopiur.yaml`
