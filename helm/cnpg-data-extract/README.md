# cnpg-data-extract

Helm chart for a **one-off Job** that starts `postgres` against an **existing CloudNativePG instance PVC**, runs **`pg_dump`** (`-Fc`) to the dump volume (or SMB share), stops Postgres, and **exits successfully**. Not wired into Flux — install manually, finish recovery, uninstall.

## When to use

- The CNPG `Cluster` is broken or you are replacing storage, but the **instance PVC** still has PGDATA you trust.
- RWO: only one Pod may mount the PVC — delete the `Cluster` (and anything else using that PVC) before installing this chart.

Background: [CNPG logical migration from PVC](../../docs/infrastructure/cnpg-logical-migration-from-pvc.md).

## Values you must set

| Value                      | Purpose                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pvc.claimName`            | Instance PVC (usually `<clusterName>-1` for 1 replica)                                                                                                               |
| `pvc.staticLonghorn`       | Optional static **PV + PVC** for PGDATA when the claim was deleted with the `Cluster` but the Longhorn volume still exists ([below](#recreate-instance-pv-and-pvc)). |
| `dump.database`            | Database name to dump                                                                                                                                                |
| `credentialsSecret.name`   | Secret with DB user/password for `pg_dump`                                                                                                                           |
| `image.tag` / `repository` | Match the **major** PostgreSQL version on disk                                                                                                                       |

Optional: `dump.fileName` (default `dump.dump`) or `dump.outputFile` (full path); `fullnameOverride` for a stable Job name; `credentialsSecret.enabled: false` and `extraEnv` if you connect another way; `job.*` for deadlines and TTL.

## CNPG PGDATA outside the operator (chart defaults)

PGDATA written by CloudNativePG still references **operator paths** (`/controller/...`) in config and archiving. The chart’s defaults in [`values.yaml`](values.yaml) account for that so `postgres` can start in the Job:

- **`postgres.extraArgs`**: turns off settings that assume CNPG sidecars (logging under `/controller/log`, TLS cert paths, socket dir under `/controller/run`, WAL **`archive_command`** to `/controller/manager`).
- **`volumePermissions`**: initContainer `chown`/`chmod` on `pgdata.dataDir` so Postgres accepts permissions on restored Longhorn volumes.

Override only if you know your volume layout differs.

## Recreate instance PV and PVC

Deleting the CNPG **`Cluster`** often deletes the instance **`PersistentVolumeClaim`** while the **Longhorn `Volume`** still holds PGDATA (e.g. after restore). The extract Job must mount that data — set:

- **`pvc.staticLonghorn.enabled: true`**
- **`pvc.staticLonghorn.volumeHandle`**: Longhorn volume name (`kubectl get volumes.longhorn.io --namespace longhorn-system` — same value as **`spec.csi.volumeHandle`** on the old PV if you still have it)
- **`pvc.staticLonghorn.capacity`** and **`storageClassName`**: must match **`spec.storage`** on the app’s rendered **`Cluster`** (same `helm template` / `yq` query as in `.cursor/skills/cnpg-logical-database-restore.md`)

The chart emits a **Retain** Longhorn PV and a PVC named **`pvc.claimName`**, same CSI shape as **`helm/generic-app/templates/storage-longhorn.yaml`** (it does **not** create a Longhorn **`Volume`** CR — that should already exist from restore). If a stale **`Released`** PV still exists with the same metadata name or **`volumeHandle`**, delete it first so the install can create a clean PV.

Example: [`examples/chaptarr-static-longhorn-smb.yaml`](examples/chaptarr-static-longhorn-smb.yaml).

## Durable dumps on SMB (same pattern as generic-app)

Set `backupSmb.enabled: true` and the same fields `generic-app` uses under `storage.smb.volumes[]`: `source`, `subDir`, `credentialsPath` (1Password path to the **same** item as your SMB backup credentials, e.g. `vaults/Secrets/items/smb-credentials` — see [generic-app SMB](../../generic-app/README.md) (`storage.smb`). The chart creates a PV, PVC, and `OnePasswordItem` for the CSI secret (like `storage-smb.yaml` in generic-app). The dump volume is mounted at `dump.mountPath` (e.g. `/backup`). Set `dump.fileName` (e.g. `authentik.dump`) so the path matches `cnpg-data-restore`’s `restore.dumpFile`. **UID 26** must be able to write on the share; if writes fail, fix CIFS ACLs / map Unix user on the NAS.

Examples: [`examples/authentik-smb.yaml`](examples/authentik-smb.yaml).

Restore from the share with the companion chart [`cnpg-data-restore`](../cnpg-data-restore/README.md) (read-only SMB mount + `pg_restore` Job).

## End-to-end logical recovery (generic)

Single source of truth for ordering: [`.cursor/skills/cnpg-logical-database-restore.md`](../../.cursor/skills/cnpg-logical-database-restore.md). Substitute namespace, cluster name, Flux `Kustomization` name, database name, and paths. Examples: [`examples/authentik.yaml`](examples/authentik.yaml), [`examples/authentik-smb.yaml`](examples/authentik-smb.yaml), [`examples/chaptarr-static-longhorn-smb.yaml`](examples/chaptarr-static-longhorn-smb.yaml).

Summary (stay **suspended** until after **`cnpg-data-restore`** succeeds; **`flux resume`** only near the end):

1. **`flux suspend kustomization <flux-kustomization-name> --namespace flux-system`**
1. **Scale app writers to 0** (`kubectl scale deployment … --namespace <namespace> --replicas 0`).
1. **`kubectl delete cluster.postgresql.cnpg.io <cluster-name> --namespace <namespace> --wait=true`**
1. If the instance PVC is **gone** but the Longhorn volume still has PGDATA, set **`pvc.staticLonghorn`** on this chart ([Recreate instance PV and PVC](#recreate-instance-pv-and-pvc)). Skip if the instance PVC is still **Bound**.
1. **`helm install <release-name> helm/cnpg-data-extract --namespace <namespace> --values /path/to/your-values.yaml`**, then **`kubectl wait --namespace <namespace> --for=condition=complete job/<job-name> --timeout=7200s`**. `<job-name>` is **`fullnameOverride`** if set, else **`<release-name>-cnpg-data-extract`**.
1. Confirm the dump is durable (**`backupSmb`** → file on the share; **emptyDir** only → copy off with **`kubectl cp`** / upload before uninstall).
1. **`helm uninstall <release-name> --namespace <namespace>`**. If **`pvc.staticLonghorn`** was used, chart-managed instance PV/PVC go with the release; clear any **stale Released** PV that would block the next claim ([above](#recreate-instance-pv-and-pvc)).
1. **Still suspended:** apply **only** the **`Cluster`** from Git (`helm template … generic-app` or `kubectl kustomize …` + `yq` — see the prompt). Wait for the new primary **Ready**.
1. **`helm install`** [`cnpg-data-restore`](../cnpg-data-restore/README.md), **`kubectl wait`** for the restore Job. Read **Target database must be empty of app schema** there if migrations raced ahead.
1. **`helm uninstall`** the restore release **`--namespace <namespace>`**.
1. **`flux resume kustomization <flux-kustomization-name> --namespace flux-system`**. You do **not** need a separate **`flux reconcile`** for this flow; the CLI may **wait for one reconciliation** after resume — that is normal.
1. **Scale the app** back to match Git and verify.

Port-forward / local **`pg_restore`** instead of **`cnpg-data-restore`** is optional:

```bash
kubectl port-forward --namespace <namespace> svc/<cluster-name>-rw 5432:5432
pg_restore --host=127.0.0.1 --port=5432 --username=<user> --dbname=<database> --clean --if-exists --no-owner ./dump.dump
```

**If Postgres will not start** in the extract Job (bad `PGDATA`, permissions, corrupt files), fix the Longhorn volume from backup first, then repeat from the chart install step.

**If `pg_dump` fails on permissions or row-level security** — `pg_dump` uses `COPY`; RLS applies to roles that are not superuser and do not bypass RLS. Point **`credentialsSecret`** at the CNPG **superuser** (username `postgres`, password from **`<cluster-name>-superuser`**). Save that Secret **before** `kubectl delete cluster` if you will need it for extract; otherwise restore the password from 1Password (or your secret store) and create a Secret the chart can reference. App credentials alone are not enough when **`FORCE ROW LEVEL SECURITY`** blocks dumps.

**If the Job failed but a file appeared on SMB** — treat the dump as **invalid** until the Job exits **0**; failed runs can leave a partial file.

## Authentik (this repo)

| Item               | Value                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Flux Kustomization | `services-authentik`                                                                                                     |
| Namespace          | `authentik`                                                                                                              |
| CNPG cluster       | `authentik-postgres` (`postgres.yaml`)                                                                                   |
| Instance PVC       | `authentik-postgres-1` (single instance)                                                                                 |
| Example values     | [`examples/authentik.yaml`](examples/authentik.yaml), [`examples/authentik-smb.yaml`](examples/authentik-smb.yaml) (SMB) |
| DB name            | `authentik`                                                                                                              |
| Scale down         | `authentik-server`, `authentik-worker`                                                                                   |

## Copy and customize

```bash
cp examples/authentik.yaml /tmp/my-recovery.yaml
# edit pvc.claimName, dump.database, credentialsSecret, image.tag, fullnameOverride, namespace via --namespace

helm install recover helm/cnpg-data-extract -f /tmp/my-recovery.yaml --namespace my-ns
```

## Lint

```bash
helm lint . -f ci/lint-values.yaml
```
