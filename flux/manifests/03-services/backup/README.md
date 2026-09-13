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

If the app writes files that are not world-readable (common: images running
as UID 1000 with 0600 files), the default mover UID 65532 gets permission
denied and the snapshot fails. Add `mover.inheritSecurityContextFrom:
pvcConsumer: {}` to the policy so the mover runs as the app's UID/GID —
this requires the app to pin `runAsUser` in its securityContext
(see jellyfin/backup.yaml).

Pilot apps: `demo-app`, `jellyfin` (config only; media PVCs are NAS-backed).
Longhorn's `daily-backup` RecurringJob stays in place until the pilot proves
out (restore drill + soak).

Kopia encrypts, compresses, and deduplicates client-side before upload, so
the RustFS bucket and any future cloud replica hold ciphertext only.

`features.credentialProjection.enabled` on the operator grants cluster-wide
`secrets` create/patch/delete RBAC (Kubernetes cannot scope `create` to a
Secret name). Gates: the repository owner must set `credentialProjection.allowed`,
each consumer opts in per policy, and `allowedNamespaces` limits tenants.

## Web UI

`spec.server` on the ClusterRepository runs the kopia web UI (htmlui, bundled
in the kopia binary) as a read-only Deployment + ClusterIP Service in
`kopiur-system`. Authentik fronts it: the blueprint in this directory creates
the proxy provider, application, and outpost — the outpost provisions its own
HTTPRoute on `https://kopia.gateway.services.apocrathia.com` (no hand-written
route). Admins group only.

The UI has no login of its own (`auth.insecure`) — Authentik is the only
authentication. `networkpolicy.yaml` compensates: ingress to the UI Service is
restricted to the `authentik` namespace, so no other in-cluster workload can
reach it. That trust covers the whole namespace (outposts, server, workers),
not just the kopia outpost. The policy selects the server pod by its kopiur
labels — re-verify it still selects the pod after kopiur chart upgrades.

The UI is read-only (browse + restore); mutations stay in GitOps. The server
pod holds the repository decryption key, so it stays behind Authentik,
ClusterIP, and the NetworkPolicy.

## Usage

```bash
kubectl get clusterrepository nas-rustfs -o wide
kubectl get snapshots -A
kubectl wait --for=condition=Ready clusterrepository/nas-rustfs --timeout=120s
```

- **Kopiur docs**: <https://kopiur.home-operations.com/>
- **Restore drills**: <https://kopiur.home-operations.com/docs/scenarios/verification-drills/>
