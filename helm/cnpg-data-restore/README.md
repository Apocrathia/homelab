# cnpg-data-restore

Helm chart for a **one-off Job** that runs **`pg_restore`** against a dump file on an **SMB/CIFS volume**, using the **same CSI + 1Password credential pattern** as [generic-app](../../generic-app/README.md) (`storage.smb`) and [`cnpg-data-extract`](../cnpg-data-extract/README.md) (`backupSmb`). The share is mounted **read-only** at `backupSmb.mountPath` (default `/backup`).

Use this after a new CNPG `Cluster` is up and the dump file already lives on the backup share (e.g. written by `cnpg-data-extract` with `backupSmb.enabled`).

## Values you must set

| Value                    | Purpose                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| `postgresql.host`        | CNPG primary Service DNS (e.g. `*-rw.*.svc`)                       |
| `postgresql.database`    | Database name                                                      |
| `restore.dumpFile`       | Full path inside the mount (e.g. `/backup/authentik.dump`)         |
| `credentialsSecret.name` | Secret with DB user/password                                       |
| `backupSmb.*`            | Same shape as extract chart: `source`, `subDir`, `credentialsPath` |

`backupSmb.enabled` must be `true` (chart fails otherwise). Align `source` / `subDir` with where you stored the dump during extract.

## Target database must be empty of app schema

`pg_restore` uses `--clean --if-exists`. If the app has already run **migrations** on the new cluster (empty tables + constraints), restores can fail with duplicate primary keys. **Scale app workloads to zero**, connect as the CNPG superuser on the primary pod (`psql -U postgres`), **`DROP DATABASE … WITH (FORCE)`** and **`CREATE DATABASE … OWNER …`**, then install this Job.

## Install

From the repo root, with a values file that sets `postgresql.host`, `postgresql.database`, `restore.dumpFile`, `credentialsSecret`, and `backupSmb` (copy and edit an example under `examples/`):

```bash
helm install <release-name> helm/cnpg-data-restore \
  --namespace <namespace> \
  --values /path/to/your-values.yaml
kubectl wait --namespace <namespace> --for=condition=complete job/<job-name> --timeout=3600s
```

`job/<job-name>` matches the chart’s computed Job name (often `fullnameOverride` if set).

**Authentik (this repo)** — concrete example:

```bash
helm install authentik-pg-restore helm/cnpg-data-restore \
  --namespace authentik \
  --values helm/cnpg-data-restore/examples/authentik.yaml
kubectl wait --namespace authentik --for=condition=complete job/authentik-pg-restore --timeout=3600s
```

Use `kubectl logs job/<job-name> --namespace <namespace>` if the Job fails.

## Lint

```bash
helm lint . -f ci/lint-values.yaml
```

## See also

- [cnpg-data-extract](../cnpg-data-extract/README.md) — dump phase and full recovery ordering.
- [CNPG logical migration from PVC](../../docs/infrastructure/cnpg-logical-migration-from-pvc.md).
