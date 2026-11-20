# CNPG Backup Component

Kustomize component that renders the barman backup wiring for a raw-CR CNPG
`Cluster`: the nightly `ScheduledBackup`, the 1Password `OnePasswordItem`
holding the bucket-scoped S3 credentials, and the `spec.backup` stanza
patched onto the consuming app's `Cluster`.

## What the component owns (constants)

- Nightly schedule `0 0 5 * * *` (05:00 UTC; CNPG cron is 6-field, seconds
  first) and `backupOwnerReference: self`
- Retention (14d), rustfs endpoint, wal/data compression, backup jobs,
  immediate checkpoint
- Shared 1Password item `vaults/Secrets/items/cnpg-backups-secrets`
- Cluster name, `serverName`, and object namespaces, derived from the
  consuming dir's `Cluster` CR via replacements

## What the consumer owns (per-app variables)

Each consuming kustomization adds the component and three patches:

1. Rename `ScheduledBackup/cnpg-backup` → `<app>-postgres-backup`
2. Rename `OnePasswordItem/cnpg-backup-secrets` → `<app>-postgres-backup-secrets`
3. On the `Cluster`: `destinationPath: s3://cnpg/<app>` plus both
   `s3Credentials` secret-name refs (added, not replaced: the component
   patch omits them on purpose)

Exact object names and namespaces are preserved from the pre-component
hand-written files, so Flux patches in place: no prune, no backup churn.

## Wiring an app

```yaml
components:
  - ../../components/cnpg-backup # depth varies per dir

patches:
  - target:
      kind: ScheduledBackup
      name: cnpg-backup
    patch: |-
      - op: replace
        path: /metadata/name
        value: <app>-postgres-backup
  - target:
      kind: OnePasswordItem
      name: cnpg-backup-secrets
    patch: |-
      - op: replace
        path: /metadata/name
        value: <app>-postgres-backup-secrets
  - target:
      kind: Cluster
    patch: |-
      - op: add
        path: /spec/backup/barmanObjectStore/destinationPath
        value: s3://cnpg/<app>
      - op: add
        path: /spec/backup/barmanObjectStore/s3Credentials/accessKeyId/name
        value: <app>-postgres-backup-secrets
      - op: add
        path: /spec/backup/barmanObjectStore/s3Credentials/secretAccessKey/name
        value: <app>-postgres-backup-secrets
```

The app's own `postgres.yaml` carries no `spec.backup` stanza. Mis-wiring
fails closed: patches without the component fail `kustomize build`, the
component without patches renders a `Cluster` missing `destinationPath` and
credential names, which the CNPG CRD marks required so the API server
rejects the apply (Flux Kustomization goes Ready=False) instead of silently
backing up to a placeholder path. Verify with `kustomize build <app-dir>`
and a diff against the pre-change render before committing.

Consumers: `03-services/authentik/`. Chart-rendered clusters
(generic-app `postgres.backup.enabled`) are out of scope: the chart keeps
rendering their backup objects.

> **Navigation**: [← Back to Flux Components README](../README.md)
