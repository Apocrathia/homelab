# CNPG: logical migration from an existing PVC

Use this when a `Cluster` is broken or you are replacing storage, but a **Longhorn PVC still has valid PostgreSQL data** and you do **not** want to rely on CNPG `bootstrap.recovery` (object store, `Backup` CR, or `VolumeSnapshot`).

This flow is **logical** (dump → restore). It works for **any** namespace and **any** CNPG workload that used a normal data directory layout.

## When to use

- PVC is bound and you believe PGDATA is intact (e.g. after Longhorn restore, or before a bad second `initdb`).
- You are okay with a maintenance window for that database.
- You will create a **new** empty volume for the replacement CNPG cluster (or delete the old PVC and let GitOps recreate claims).

## When not to use

- You have a supported **physical** recovery path (Barman backup, `Backup` CR, or `VolumeSnapshot` per [CloudNativePG recovery](https://cloudnative-pg.io/documentation/current/recovery/)) — prefer that for large DBs and replication fidelity.

## Prerequisites

1. **PostgreSQL major version** for the “extract” pod should **match** the data in PGDATA (e.g. 16.x data → `postgresql:16` image). Check the app’s `Cluster` manifest `imageName` or an old backup note.
2. **Confirm PGDATA path** on the volume (CNPG usually uses a `pgdata` directory under the mount). Verify on a running instance if you still have one:

   ```bash
   kubectl get pod -n "<namespace>" -l cnpg.io/cluster="<cluster-name>" -o jsonpath='{.items[0].spec.containers[0].env[?(@.name=="PGDATA")].value}{"\n"}'
   ```

   If that returns nothing, inspect the same pod’s volume mounts and list the mount directory.

3. **Secrets**: you need credentials that can connect for dumps (superuser, or a role with enough rights). Use existing Kubernetes secrets or a one-off secret — do **not** commit real values to git.

## Outline

1. Stop writers (app scale to zero or maintenance mode).
2. Remove only the **CNPG `Cluster`** (and jobs/pods) so nothing else keeps the PVC open — **or** scale to zero and delete the cluster; keep the **PVC** if it still exists. If the operator deletes the instance PVC with the cluster but the Longhorn volume is intact, recreate PV/PVC via **`helm/cnpg-data-extract`** values **`pvc.staticLonghorn`** (see that chart’s README) instead of hand-written YAML.
3. Schedule a **temporary** pod that mounts **that PVC** read-write, runs Postgres against that PGDATA, and exposes nothing to the cluster except what you need (or use `kubectl exec` only).
4. **`pg_dump` / `pg_dumpall`** to durable storage (another PVC, object storage, or `kubectl cp` off the node).
5. Delete the temp workload. **Delete the old PVC** if you are replacing the volume, or leave it if you are only refreshing the cluster object (your call).
6. Apply GitOps so a **new** `Cluster` gets a **fresh** PVC and normal `bootstrap.initdb`.
7. **Restore** dumps into the new primary (`<cluster-name>-rw`).
8. Point the app at the service and validate.

## Extract pod (pattern)

Use a **single-replica** `Deployment` or `Job` with:

- The **same** `postgres` image major as the data.
- `securityContext` aligned with the image (official Postgres often expects uid **26**; match what the image documents).
- Volume mount: the existing **PVC** at the same path CNPG used (typically `/var/lib/postgresql/data`).
- `PGDATA` env pointing at the real directory under that mount (often `.../pgdata`).

Do **not** check this YAML into the repo with real names if it is one-off; keep it local or use placeholders.

Example shape (fill in namespace, PVC name, image, PGDATA):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pg-extract
  namespace: your-namespace
spec:
  securityContext:
    fsGroup: 26
  containers:
    - name: postgres
      image: ghcr.io/cloudnative-pg/postgresql:16
      securityContext:
        runAsUser: 26
        runAsNonRoot: true
      env:
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
      volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
      # Prefer exec into the pod and run pg_dump from there once postgres is up
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: your-cnpg-instance-pvc
```

Start Postgres only if the data directory is **consistent** (if unsure, restore Longhorn from backup first, then start).

## Dump commands (manual pod pattern, or use `cnpg-data-extract` Job)

- Globals (roles/tablespaces): `pg_dumpall -g` or full `pg_dumpall` for small clusters.
- Single database: `pg_dump -Fc -f /tmp/app.dump <dbname>`

Store artifacts outside the pod.

## Restore (new CNPG cluster)

1. Wait for the new primary pod ready.
2. `pg_restore` / `psql` against the `-rw` service (or port-forward) using credentials from your secret story.

If you use the **[`cnpg-data-restore`](../../helm/cnpg-data-restore/README.md)** Helm chart, read **Target database must be empty of app schema** there: apps that run **migrations** on a fresh `initdb` database before `pg_restore` will hit duplicate constraint errors unless you scale the app to zero and recreate an empty database (e.g. `DROP DATABASE … WITH (FORCE)` / `CREATE DATABASE … OWNER …` as the superuser on the primary pod).

## Longhorn

If the PVC is empty or corrupt, **restore from Longhorn backup** onto that volume _before_ the extract **Job** runs. Operational notes live in [`scripts/longhorn/README.md`](../../scripts/longhorn/README.md).

## Flux

While you delete PVCs or `Cluster` objects, **suspend** the owning Kustomization if you need to stop it from immediately re-applying a half-fixed state. Resume after the new cluster and restores are verified.

## Helm chart (parameterized extract Job)

Use the **`cnpg-data-extract`** chart: [`helm/cnpg-data-extract/README.md`](../../helm/cnpg-data-extract/README.md) has the **end-to-end recovery** summary; full ordering lives in [`.cursor/skills/cnpg-logical-database-restore.md`](../../.cursor/skills/cnpg-logical-database-restore.md). The chart **`Job`** runs **`pg_dump`** automatically. Optional **`pvc.staticLonghorn`** recreates instance **PV + PVC** when the claim vanished with the **`Cluster`** but the Longhorn volume still exists. Optional **`backupSmb`** writes dumps to the same CIFS layout as [generic-app](../../helm/generic-app/README.md) `storage.smb`. For restore from the share, use [`cnpg-data-restore`](../../helm/cnpg-data-restore/README.md). For Authentik in this repo, copy [`examples/authentik.yaml`](../../helm/cnpg-data-extract/examples/authentik.yaml) (or [`authentik-smb.yaml`](../../helm/cnpg-data-extract/examples/authentik-smb.yaml)) and the mapping table in that README.
