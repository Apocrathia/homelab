# IDENTITY and PURPOSE

You are assisting with a **logical backup and restore** of a **CloudNativePG** PostgreSQL database in this repository: **`pg_dump`** from PGDATA on the instance PVC, then a **fresh** CNPG `Cluster` and **`pg_restore`** into the new primary. Use the **`cnpg-data-extract`** and **`cnpg-data-restore`** Helm charts under `helm/` and `docs/infrastructure/cnpg-logical-migration-from-pvc.md`.

**Where PGDATA comes from (this homelab):** recovery assumes the CNPG instance volume was **restored from a Longhorn backup** onto the Longhorn **`Volume`** that backs **`[INSTANCE_PVC]`**, unless you are extracting from a volume that was never wiped. Longhorn restore is **operator-led** (UI, **`fromBackup`**, etc.). **Agents must not** mutate Longhorn **`Volume`** / unrelated PV/PVC / **`longhorn-system`** unless the operator **explicitly** names the commands.

**How `Cluster` is defined in Git** differs by app:

- **`generic-app`**: CNPG is embedded — render with **`helm template …`** from the app’s **`HelmRelease`** **`spec.values`** and **`helm/generic-app`**.
- **Standalone manifest**: CNPG is a separate YAML checked in next to the app — render with **`kubectl kustomize`** / **`kubectl apply -k`** on that directory, or **`yq`** to select only the **`Cluster`**. If **`postgres.yaml`** sits beside a **`HelmRelease`** in the same Flux bundle, Phase 2 must still apply **only** the **`Cluster`** (via **`yq`**, not the whole directory), or Flux may reconcile the app before restore.

This prompt is the runbook for ordering: **suspend Flux → extract → new empty cluster (while still suspended) → restore → uninstall restore → `flux resume` → app up**. Do **`flux resume`** only **after** **`cnpg-data-restore`** succeeds — not before **`pg_restore`**. **`flux reconcile`** on the **`Kustomization`** is **not** required — **`flux resume`** is enough for this flow (the CLI may still **wait for one reconciliation** after resume — that is normal).

**Agents run the full sequence through Phase 4** — including **`helm uninstall`** of the restore release, **`flux resume`**, and scaling **`[APP_DEPLOYS]`** back — when cluster API access allows. Do not stop after a successful restore **`Job`** and hand off “next steps” to the operator unless blocked (auth, approval gates, or explicit operator-only work).

# Scope

- **In scope**: Single CNPG cluster per workload, instance PVC **`[CLUSTER_NAME]-1`** for one replica, dump format **custom** (`-Fc`), restore via **`cnpg-data-restore`** (SMB) or manual **`pg_restore`** / port-forward.
- **Out of scope**: CNPG **`bootstrap.recovery`** from object store / `Backup` CR / `VolumeSnapshot` when that path is preferred ([CloudNativePG recovery](https://cloudnative-pg.io/documentation/current/recovery/)).

## Related (narrower) prompts

| Prompt                                               | Role                                                                                                                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`.cursor/skills/generic-app-longhorn-restore.md`** | PV/PVC **Retain**, **`fromBackup`**, **`helm template`** for **`storage.longhorn.volumes`** — **not** CNPG instance templates; reuse ideas for **RWO** CNPG PVCs. |

# Repository pointers (do not duplicate tunables here)

| Topic                              | Location                                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| End-to-end narrative               | `docs/infrastructure/cnpg-logical-migration-from-pvc.md`                                                                                                                                                                                                                                                        |
| Extract Job chart                  | `helm/cnpg-data-extract/README.md`, `helm/cnpg-data-extract/values.yaml`                                                                                                                                                                                                                                        |
| Restore Job chart                  | `helm/cnpg-data-restore/README.md`                                                                                                                                                                                                                                                                              |
| Examples                           | Under **`helm/cnpg-data-extract/examples/`** (SMB, **`pvc.staticLonghorn`**) and **`helm/cnpg-data-restore/examples/`**.                                                                                                                                                                                        |
| Standalone app layout              | `Cluster` lives in the app’s directory under **`flux/manifests/`** — suspend the Flux **`Kustomization`** whose **`spec.path`** covers that tree (see **`flux-kustomization.yaml`** files under **`flux/manifests/`**).                                                                                         |
| Finding **`[FLUX_KUSTOMIZATION]`** | **`metadata.name`** on the Flux **`Kustomization`** whose **`spec.path`** includes the app (often one per area: **`04-apps/<area>/`**, **`03-services/<service>/`**, etc.). Search **`flux/manifests/`** for the **`flux-kustomization.yaml`** or parent **`kustomization.yaml`** that references the workload. |
| Multiple `Cluster` in one dir      | If **`kubectl kustomize`** emits more than one **`Cluster`**, add **`and .metadata.name == "[CLUSTER_NAME]"`** to the Phase 2 **`yq`** filter so only the intended cluster is applied.                                                                                                                          |

## Homelab SMB layout for logical dumps (cnpg-data-\* charts)

Durable **`pg_dump`** output and **`pg_restore`** input live on the **Library** SMB share under **`Homelab/Backups/cnpg`** (same layout as many apps’ `storage.smb` in **`generic-app`**). In browse terms that is **`Storage` / `Library` / `Homelab` / `Backups` / `cnpg`** on the file server; in chart values it is typically:

- **`backupSmb.source`**: `//storage.services.apocrathia.com/Library`
- **`backupSmb.subDir`**: `Homelab/Backups/cnpg`

**`[DUMP_PATH]`** is the path **inside the Job** (e.g. **`restore.dumpFile`**: `/backup/<workload>.dump` when **`backupSmb.mountPath`** is `/backup`), not the UNC string above. **`[SMB_VALUES]`** must use the same **`source`** / **`subDir`** / **`credentialsPath`** for extract and restore so both Jobs see the same file.

# Inputs (collect before acting)

| Variable                  | Description                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `[NAMESPACE]`             | Kubernetes namespace for the app and CNPG cluster.                                                                                                                                                                                                                                                                                                                                                                             |
| `[CLUSTER_NAME]`          | CNPG `Cluster` `metadata.name` (usually **`<workload>-postgres`** for single-instance stacks).                                                                                                                                                                                                                                                                                                                                 |
| `[INSTANCE_PVC]`          | Instance PVC: **`[CLUSTER_NAME]-1`**.                                                                                                                                                                                                                                                                                                                                                                                          |
| `[PG_MAJOR]`              | Postgres major — must match `spec.imageName` / data on disk and chart **`image.tag`**.                                                                                                                                                                                                                                                                                                                                         |
| `[DATABASE]`              | Database name to dump and restore (`bootstrap.initdb.database` or app default).                                                                                                                                                                                                                                                                                                                                                |
| `[FLUX_KUSTOMIZATION]`    | Flux **`Kustomization`** that applies this app’s **`spec.path`** — **suspend** during destructive steps.                                                                                                                                                                                                                                                                                                                       |
| `[APP_DEPLOYS]`           | Deployments / StatefulSets to scale to **0** during extract and until after restore. Prefer scaling **only** workloads that read/write **this** database; other pods in the same namespace may be unrelated. If many components share the DB, enumerate with **`kubectl get deploy,statefulset --namespace [NAMESPACE] -o name`** and scale accordingly. Phase 4 replica counts should match Git (often **1** per Deployment). |
| `[SMB_VALUES]`            | `backupSmb.source`, `subDir`, `credentialsPath` — align with **Homelab SMB layout** above and chart examples; **do not** commit secrets; use 1Password paths as in chart examples.                                                                                                                                                                                                                                             |
| `[DUMP_PATH]`             | Full path to the custom-format dump **inside the extract/restore Job** (e.g. `/backup/<workload>.dump`) — must match extract output and **`restore.dumpFile`**. On disk under the share this lives under **`Homelab/Backups/cnpg/`**.                                                                                                                                                                                          |
| `[EXTRACT_RELEASE_NAME]`  | `helm install` release name for **`cnpg-data-extract`**.                                                                                                                                                                                                                                                                                                                                                                       |
| `[EXTRACT_JOB_NAME]`      | Extract **`Job`** `metadata.name`: if **`fullnameOverride`** is set, it is the **full** Job name (no extra suffix — see chart **`templates/_helpers.tpl`**). If unset, the chart default is **`[EXTRACT_RELEASE_NAME]-cnpg-data-extract`**.                                                                                                                                                                                    |
| `[RESTORE_RELEASE_NAME]`  | `helm install` release name for **`cnpg-data-restore`**.                                                                                                                                                                                                                                                                                                                                                                       |
| `[RESTORE_JOB_NAME]`      | Restore **`Job`** `metadata.name`: same rule — **`fullnameOverride`** is the full name when set; else **`[RESTORE_RELEASE_NAME]-cnpg-data-restore`**.                                                                                                                                                                                                                                                                          |
| `[LONGHORN_VOL]` (verify) | Longhorn **`Volume`** name — PV **`spec.csi.volumeHandle`**. Read-only confirmation; agents do not mutate Longhorn CRs.                                                                                                                                                                                                                                                                                                        |
| `[CLUSTER_SOURCE]`        | **`helm`** — values from **`HelmRelease`** + **`helm/generic-app`**; **`kustomize`** — directory that emits standalone **`postgres.yaml`** / **`Cluster`**.                                                                                                                                                                                                                                                                    |
| `[HELMRELEASE_NAME]`      | Flux **`HelmRelease`** `metadata.name` (when **`[CLUSTER_SOURCE]`** is **`helm`**).                                                                                                                                                                                                                                                                                                                                            |
| `[HELMRELEASE_PATH]`      | Path to **`HelmRelease`** YAML in Git (when **`helm`**).                                                                                                                                                                                                                                                                                                                                                                       |
| `[KUSTOMIZE_DIR]`         | Path to kustomization that emits the **`Cluster`** (when **`kustomize`**).                                                                                                                                                                                                                                                                                                                                                     |

Confirm from Git: **`Cluster`** storage **size** (see below), class, **`bootstrap.initdb`** / app DB name, owner secret, **`spec.imageName`** / **`[PG_MAJOR]`**, and whether the workload uses **`generic-app`** or a **standalone** CNPG manifest.

**`pvc.staticLonghorn.capacity`** must match the rendered **`Cluster`** **`spec.storage.size`** exactly (sizes vary by workload). Use the **`helm`** / **`kustomize`** **`yq`** one-liners in Phase 1 to read **`spec.storage`**; do not assume a default.

# Principles

1. **RWO**: Only one consumer on **`[INSTANCE_PVC]`** — delete the CNPG **`Cluster`** before the extract **Job** mounts the PVC.
2. **Flux last**: **`flux suspend`** while deleting **`Cluster`** / PVCs if Git would recreate a bad state. **`flux resume` only after** the **`cnpg-data-restore`** Job **Succeeded** and you have **uninstalled** that Helm release (or are ready to). **Never** resume the owning **`Kustomization`** before **`pg_restore`** — the **`HelmRelease`** can reconcile the app and run migrations on an empty **`initdb`** DB.
3. **New `Cluster` while Flux is still suspended**: apply only the **`Cluster`** (from **`helm template`** or **`kustomize`**) so a new primary exists; do **not** rely on **`flux resume`** to create the cluster before restore.
4. **Extract chart**: The **`Job`** runs **`pg_dump`** automatically (`helm/cnpg-data-extract/README.md`).
5. **Restore chart**: **`pg_restore --clean --if-exists`** vs app migrations — see **Target database must be empty of app schema** in `helm/cnpg-data-restore/README.md`.
6. **Longhorn PV/PVC**: **`volumeHandle`** must match the restored Longhorn **`Volume`**. For **Retain** / **Released** PV discipline, see **`.cursor/skills/generic-app-longhorn-restore.md`**. The **`generic-app`** chart does not emit instance PV/PVC for postgres, but **`cnpg-data-extract`** can emit the same static Longhorn shape via **`pvc.staticLonghorn`**.
7. **Agent boundaries**: **`[NAMESPACE]`** only for extract/restore/Cluster helpers; **read-only** in **`longhorn-system`** unless the operator delegates.
8. **No recovery YAML in Git**: do not commit one-off recovery manifests. Prefer **`pvc.staticLonghorn`** on **`cnpg-data-extract`** (PV + PVC in the extract release). Manual PV/PVC under **`/tmp`** + **`kubectl apply`** is fallback only.
9. **`kubectl delete cluster`** often deletes the instance PVC. If the claim is gone but Longhorn data is good, **recreate instance PV/PVC** (below) before extract — via the extract chart or manual apply.

# Procedure

## Phase 0 — Longhorn and instance PVC ready (operator-led)

**Agents:** do **not** automate Longhorn **`fromBackup`** / destructive PV/Volume steps unless the operator explicitly names them. You will be given a volume name that has been restored from a backup that you will be working with.

1. **Scale** **`[APP_DEPLOYS]`** to **0** when you are still in maintenance (may already be done).
2. For a **full** Longhorn restore of the CNPG volume (same **Retain / delete / restore / rebind** ideas as **`.cursor/skills/generic-app-longhorn-restore.md`**, but for the **dynamically provisioned** instance PVC, not `storage.longhorn.volumes`):
   - Record **`[LONGHORN_VOL]`** from the PV **`volumeHandle`** or Longhorn UI before you delete the PV if you still need it.
   - Restore from backup; wait until the Longhorn volume is healthy.
3. **What must exist before Phase 1 extract:** a healthy Longhorn **`Volume`** whose name matches **`[LONGHORN_VOL]`** (same value as PV **`spec.csi.volumeHandle`** / **`kubectl get volumes.longhorn.io --namespace longhorn-system`**). You do **not** need a pre-existing **`Bound`** **`[INSTANCE_PVC]`** when the claim was deleted with the **`Cluster`** — that is normal; only the restored Longhorn volume may exist. **`cnpg-data-extract`** with **`pvc.staticLonghorn.enabled: true`** creates the static PV + PVC that bind to **`[LONGHORN_VOL]`** in the **same** Helm install as the extract **Job** (see Phase 1). If an instance PVC is **already** **`Bound`** to the correct volume (no **`staticLonghorn`**), use **`pvc.claimName`** only and skip static PV/PVC in values.

## Phase 1 — Suspend Flux, delete `Cluster`, extract, optional delete old PVC

1. **`flux suspend kustomization [FLUX_KUSTOMIZATION]`** **`--namespace flux-system`** if not already suspended.
2. **Scale** **`[APP_DEPLOYS]`** to **0**.
3. **`kubectl delete cluster.postgresql.cnpg.io [CLUSTER_NAME]`** **`--namespace [NAMESPACE]`** **`--wait=true`**.

### Recreate instance PV/PVC (when the claim vanished with the `Cluster`)

Use **`pvc.staticLonghorn`** when **only** the Longhorn volume exists (no instance PVC yet) or the claim is not **`Bound`**. Skip **`staticLonghorn`** only if **`kubectl get pvc [INSTANCE_PVC]`** is **`Bound`** to the correct PV **`volumeHandle`** already.

**Preferred:** set **`pvc.staticLonghorn.enabled: true`** on **`helm/cnpg-data-extract`** with **`pvc.staticLonghorn.volumeHandle`** = **`[LONGHORN_VOL]`** (Longhorn **`Volume`** CR name from **`kubectl get volumes.longhorn.io --namespace longhorn-system`**). Set **`capacity`** / **`storageClassName`** to match the rendered **`Cluster`** **`spec.storage`**:

**`helm`** (generic-app):

```bash
yq '.spec.values' [HELMRELEASE_PATH] > /tmp/[APP]-helm-values.yaml
helm template [HELMRELEASE_NAME] helm/generic-app -f /tmp/[APP]-helm-values.yaml --namespace [NAMESPACE] \
  | yq 'select(.kind == "Cluster" and .metadata.name == "[CLUSTER_NAME]") | .spec.storage'
```

**`kustomize`** (standalone):

```bash
kubectl kustomize [KUSTOMIZE_DIR] | yq 'select(.kind == "Cluster" and .metadata.name == "[CLUSTER_NAME]") | .spec.storage'
```

The chart installs the static PV + PVC in the **same** release as the extract **Job** (see **`helm/cnpg-data-extract/README.md`** and **`helm/cnpg-data-extract/examples/`**).

**Manual fallback:** **`kubectl apply`** of PV + PVC with the same shape as **`helm/generic-app/templates/storage-longhorn.yaml`** under **`/tmp`** only — do not commit recovery YAML.

4. **`helm install [EXTRACT_RELEASE_NAME]`** `helm/cnpg-data-extract` with **`pvc.claimName`**, optional **`pvc.staticLonghorn`**, **`image.tag`**, **`dump.database`**, **`dump.mountPath`** / **`fileName`** / **`outputFile`** matching **`[DUMP_PATH]`**, **`credentialsSecret`**, optional **`backupSmb`**.
5. **`kubectl wait --namespace [NAMESPACE] --for=condition=complete job/[EXTRACT_JOB_NAME] --timeout=7200s`**
6. **`helm uninstall [EXTRACT_RELEASE_NAME]`** **`--namespace [NAMESPACE]`** — removes the extract **Job** and chart-managed resources; if **`pvc.staticLonghorn`** was used, instance PV/PVC from that release go with it.
7. Ensure nothing blocks a **new** dynamic instance PVC for Phase 2: **only after** the dump is durable (SMB or copied off), delete any **stale** instance PV/PVC left over (e.g. **Released** PV with **Retain**) that would conflict with the replacement **`Cluster`**. If step 6 already removed static PV/PVC from the extract chart, confirm no conflicting **`volumeHandle`** / name remains (`helm/cnpg-data-extract/README.md`).

## Phase 2 — New `Cluster` (Flux still suspended)

**Do not `flux resume` yet.**

Apply **only** the **`postgresql.cnpg.io/v1` `Cluster`** from Git so a new primary and empty instance PVC come up. Pick **one**:

### A — From `generic-app` `HelmRelease`

```bash
yq '.spec.values' [HELMRELEASE_PATH] > /tmp/[APP]-helm-values.yaml
helm template [HELMRELEASE_NAME] helm/generic-app -f /tmp/[APP]-helm-values.yaml --namespace [NAMESPACE] \
  | yq ea 'select(.kind == "Cluster" and .apiVersion == "postgresql.cnpg.io/v1")' - \
  | kubectl apply -f -
```

### B — From standalone manifests

If the directory emits **multiple** `Cluster` resources, narrow by name:

```bash
kubectl kustomize [KUSTOMIZE_DIR] \
  | yq ea 'select(.kind == "Cluster" and .apiVersion == "postgresql.cnpg.io/v1" and .metadata.name == "[CLUSTER_NAME]")' - \
  | kubectl apply -f -
```

If there is only ever one `Cluster`, the **`and .metadata.name …`** clause may be omitted:

```bash
kubectl kustomize [KUSTOMIZE_DIR] \
  | yq ea 'select(.kind == "Cluster" and .apiVersion == "postgresql.cnpg.io/v1")' - \
  | kubectl apply -f -
```

Wait until the new primary is serving (keep **`[APP_DEPLOYS]`** at **0** until Phase 4). Prefer one of:

- **`kubectl wait --namespace [NAMESPACE] --for=condition=Ready pod/[CLUSTER_NAME]-1 --timeout=600s`** — the instance pod name for a single-replica cluster is **`[CLUSTER_NAME]-1`**.
- **`kubectl get cluster.postgresql.cnpg.io [CLUSTER_NAME] --namespace [NAMESPACE] -w`** until **`STATUS`** is healthy and **`READY`** matches **`INSTANCES`**.

**Race:** right after **`kubectl apply`**, **`kubectl wait pod/[CLUSTER_NAME]-1`** may fail with **NotFound** while CNPG schedules init work. Retry after a few seconds, or loop until **`kubectl get pod [CLUSTER_NAME]-1 --namespace [NAMESPACE]`** exists, then **`kubectl wait`** for **Ready**.

Avoid relying only on **`kubectl wait pod -l cnpg.io/cluster=[CLUSTER_NAME]`** — short-lived **initdb** pods can share that label and satisfy or confuse readiness checks before the long-running primary **`[CLUSTER_NAME]-1`** is up.

## Phase 3 — Logical restore (`cnpg-data-restore`)

**Still while `[FLUX_KUSTOMIZATION]` is suspended.**

1. If needed, **empty** the target database per **`helm/cnpg-data-restore/README.md`** (superuser **`DROP DATABASE` / `CREATE DATABASE`**).
2. **`helm install [RESTORE_RELEASE_NAME]`** `helm/cnpg-data-restore` with **`postgresql.host`** = **`[CLUSTER_NAME]-rw.[NAMESPACE].svc.cluster.local`**, **`postgresql.database`**, **`restore.dumpFile`** = **`[DUMP_PATH]`**, **`credentialsSecret`**, **`image.tag`** = **`[PG_MAJOR]`**, **`backupSmb`** aligned with extract.
3. **`kubectl wait --namespace [NAMESPACE] --for=condition=complete job/[RESTORE_JOB_NAME] --timeout=7200s`**

## Phase 4 — GitOps and app

**Execute these steps;** they are not optional handoff items after a successful restore **`Job`**.

1. **`helm uninstall [RESTORE_RELEASE_NAME]`** **`--namespace [NAMESPACE]`** when verified; confirm no stray restore SMB PVCs if the chart created them.
2. **`flux resume kustomization [FLUX_KUSTOMIZATION]`** **`--namespace flux-system`**. That is enough — **do not** treat **`flux reconcile`** as part of this runbook. Resolve drift if hand-applied **`Cluster`** differs from what Git will re-apply.
3. **Scale** **`[APP_DEPLOYS]`** to match Git (or let the **`HelmRelease`** controller update the **`Deployment`**) and verify the app (e.g. **`kubectl wait`** for **Available** / pod **Ready**).

### Extract failed or data not needed (no logical restore)

If the extract **`Job`** fails, or the operator **does not** need data from PGDATA (fresh **`initdb`** is acceptable): **`helm uninstall [EXTRACT_RELEASE_NAME]`** if still installed, then apply **only** the **`Cluster`** as in Phase 2 (empty database), then **`flux resume`**, then scale the app — **skip Phase 3** entirely. Do not **`flux resume`** before the **`Cluster`** exists if Git would fight you; ordering matches Phase 2 → Phase 4 without **`cnpg-data-restore`**.

## Cleanup

Treat extract and restore installs as **disposable**. Chart **`ttlSecondsAfterFinished`** applies until **`helm uninstall`**.

### After restore succeeds

Same ordering as **Phase 4** for the restore release: **`helm uninstall [RESTORE_RELEASE_NAME]`** — removes Job, pods, SMB PVC/PV from chart, **`OnePasswordItem`** for SMB creds when applicable. Then **`kubectl get job,pod,pvc --namespace [NAMESPACE]`** — no leftover restore-named resources. **`helm uninstall [EXTRACT_RELEASE_NAME]`** only if an extract release is still present (should already be gone before Phase 2).

### If something is stuck

- **`kubectl delete job [JOB_NAME] --namespace [NAMESPACE]`** after **`helm uninstall`** fails.
- **SMB PV/PVC**: names like **`[RELEASE]-restore-smb-*`** — delete only if unused.

### Other hygiene

- **`backupSmb`**: dump lives on the **share** from the extract **Job** — no laptop **`kubectl cp`** unless you used **emptyDir** only.
- **`/tmp`** manifests are ephemeral — **no cleanup step**.
- Do not commit dumps or recovery YAML into **git**.

# Verification

- Restore **`Job`** exit **0**; app shows expected data after Phase 4.
- No duplicate **`Cluster`** or stuck **`Pending`** instance PVC after GitOps catches up post-resume.
- **`pg_isready`** (or other client binaries) may **not** exist in application images; use a **debug** pod / **`kubectl run`** with an image that ships **`postgresql-client`**, or rely on app health endpoints and **`Cluster`** **`STATUS`** instead of **`kubectl exec`** into the app for SQL probes.

# See also

- `.cursor/skills/generic-app-longhorn-restore.md` — Longhorn **Retain**, **`fromBackup`**, static PV/PVC patterns (adapt for CNPG instance PVC naming).
- `scripts/longhorn/README.md` — Longhorn operations.
