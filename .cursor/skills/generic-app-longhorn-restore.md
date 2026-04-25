# IDENTITY and PURPOSE

You are assisting with a **Longhorn volume restore** for a workload deployed via the **`generic-app`** Helm chart in this repository. The goal is a safe, repeatable sequence: detach workloads, restore data from a Longhorn backup onto a volume whose name matches Git, re-create Kubernetes storage objects when needed, then bring the app back.

This prompt is for **operators and other AI agents**. It does not replace reading the app’s `HelmRelease` and `helm/generic-app` templates for the specific service.

# Scope

- **In scope**: Apps using `generic-app` with `storage.longhorn.enabled` and one or more `storage.longhorn.volumes` entries.
- **Out of scope**:
  - **CNPG** instance PVCs (`*-postgres-1`): full logical flow (extract → new cluster → restore) lives in **`.cursor/skills/cnpg-logical-database-restore.md`**. This file still describes **PV/PVC / Longhorn** mechanics you reuse for that PVC; it does not cover **`pg_dump` / `pg_restore`**.
  - **SMB and other non-Longhorn** PVCs in the same namespace (often `*-pvc` with RWX). Do not delete or re-render those when working on Longhorn.
  - Non-Helm workloads.

**HelmRelease chart reference (this repo):** `spec.chart.spec.chart` is **`./helm/generic-app`** (path into the GitRepository), not the string `generic-app` alone. When listing `HelmRelease`s that use this chart, filter with something like: chart path **contains** `generic-app`.

# Inputs (collect before acting)

| Variable             | Description                                                                             |
| -------------------- | --------------------------------------------------------------------------------------- |
| `[APP_NAME]`         | `values.app.name` (e.g. `plex`) — Longhorn volume names are `{APP_NAME}-{VOL_KEY}`.     |
| `[NAMESPACE]`        | App namespace (often same as `[APP_NAME]`).                                             |
| `[HELMRELEASE_NAME]` | Flux `HelmRelease` `metadata.name` in `[NAMESPACE]`.                                    |
| `[HELMRELEASE_PATH]` | Path to the HelmRelease YAML in Git (e.g. `flux/manifests/.../helmrelease.yaml`).       |
| `[LONGHORN_VOL]`     | Longhorn volume CR name — for a volume `config` in values, this is `[APP_NAME]-config`. |
| `[VOL_KEY]`          | The `storage.longhorn.volumes[].name` entry (e.g. `config`).                            |

Confirm from Git:

- Longhorn volumes are declared under `spec.values.storage.longhorn.volumes` in the HelmRelease.
- Chart template `helm/generic-app/templates/storage-longhorn.yaml` emits, per volume: **Longhorn `Volume` CR** (in `longhorn-system`), **static `PersistentVolume`**, **`PersistentVolumeClaim`** in the app namespace, with fixed names tied to `[APP_NAME]` and `[VOL_KEY]`.

# Principles

1. **Desired state lives in Git** — tunable replica counts and storage sizes are in the HelmRelease; do not duplicate them in this prompt.
2. **Static PV/PVC are chart-shaped** — After deleting PVC, PV, and/or the Longhorn `Volume` CR, **waiting passively for a PVC to “reappear” is unreliable**. A **`helm template` of `helm/generic-app` using the HelmRelease’s values, followed by `kubectl apply` of the right documents** for the target volume(s) is the deterministic fix when objects are missing or not binding.
3. **Cluster access** — Use `kubectl` forms your environment allows (e.g. `kubectl get pvc --namespace [NAMESPACE]` or `kubectl scale deployment [NAME] --namespace [NAMESPACE] --replicas=0`).
4. **Replica count vs Git** — Scaling with `kubectl scale` while `spec.values.app.replicas` in Git still says `1` creates drift: the next successful Helm reconcile can reset replicas. During maintenance, either set **`app.replicas: 0`** in the HelmRelease and reconcile, **`flux suspend helmrelease`** for that app, or after recovery **`kubectl scale`** back up and confirm Git matches what you want.
5. **Symptoms** — A **faulted** or not-ready Longhorn volume often surfaces as **`FailedAttachVolume`** / _volume … is not ready for workloads_ and pods stuck in **`ContainerCreating`**. **Scale the workload to 0** before deleting PVCs or kicking restores so nothing keeps trying to attach.
6. **Scale-up order** — After a Longhorn restore, **Kubernetes needs the static PV and PVC before the workload**. Longhorn data can be healthy while **`[APP_NAME]-config`-style objects are still absent**; scaling the Deployment first creates pods that cannot bind storage. **Apply PV/PVC (rendered from `helm/generic-app`), confirm PVC `Bound`, then scale up** (or delete a pod that was created too early so the ReplicaSet creates a new one).

# Preconditions

- Workload using the PVC is **scaled to 0** (`spec.values.app.replicas: 0` reconciled, or equivalent), so nothing mounts the volume.
- Longhorn **backup exists** for the volume (backup URL resolvable from Longhorn APIs when using `spec.fromBackup` flows). To use a backup other than **`status.lastBackup`**, pick the correct **Backup** CR / URL from the Longhorn UI or `kubectl get backups.longhorn.io -n longhorn-system`.
- Disks/nodes healthy enough for Longhorn to schedule replicas (fix Longhorn node/disk issues before large restores).

# Procedure (high level)

1. **Scale down** the app Deployment so no pod mounts the Longhorn volume(s).
2. **Delete PVC** for each target Longhorn volume (only those names; **not** CNPG or SMB PVCs in the namespace).
3. **Delete PV** when needed:
   - Chart static PVs use **reclaim policy `Retain`**. After the PVC is gone, the PV moves to **`Released`** and must be **deleted** before you can recreate a same-named static PV.
   - If you still had a **dynamically provisioned** Longhorn PV (PVC `volumeName` like `pvc-<uid>`), reclaim is often **`Delete`** and the PV may disappear with the PVC—nothing extra to delete.
4. **Restore** the Longhorn volume from backup (UI, or patch `volumes.longhorn.io/[LONGHORN_VOL]` with `spec.fromBackup` to the backup URL, per Longhorn docs for your version).
5. **Wait** until the Longhorn volume can attach (healthy / restored per your cluster).
6. **Re-create Kubernetes objects** from the chart:
   - **Preferred long-term**: `flux reconcile helmrelease --namespace [NAMESPACE] [HELMRELEASE_NAME] --with-source`, then verify Longhorn `Volume` + PV + PVC exist and PVC is `Bound`.
   - **If PV/PVC are missing or wrong**: render from **Git** (see **Render command**) and apply **only** what you need. When the Longhorn **`Volume` CR already exists** from restore, apply **only `PersistentVolume` + `PersistentVolumeClaim`** so you do not overwrite in-progress restore state on the Volume CR.
   - Right after apply, the PVC may show **`Pending`** briefly, then **`Bound`** once the volume is ready for attachment.
7. **Gate before scale-up** — Do **not** raise replicas until **`PersistentVolume` and `PersistentVolumeClaim` exist** and the PVC is **`Bound`** to the correct PV (`spec.csi.volumeHandle` = `[LONGHORN_VOL]`). If the workload scaled up while the PVC was missing or **`Pending`**, fix storage first, wait for **`Bound``, then **delete the stuck pod\*\* if needed so a new one schedules.
8. **Scale up** (Git and/or `kubectl scale` per your drift strategy). **Verify** pod running, PVC `Bound`, app healthy.

# Render command (reference)

From the repo root, using the **Git** HelmRelease file as the source of values (adjust paths):

```bash
yq '.spec.values' [HELMRELEASE_PATH] > /tmp/[APP_NAME]-helm-values.yaml
helm template [HELMRELEASE_NAME] helm/generic-app -f /tmp/[APP_NAME]-helm-values.yaml --namespace [NAMESPACE] \
  | yq ea 'select(
      (.kind == "PersistentVolume" or .kind == "PersistentVolumeClaim" or (.kind == "Volume" and .apiVersion == "longhorn.io/v1beta2"))
      and .metadata.name == "[LONGHORN_VOL]"
    )' -
```

**PV + PVC only** (typical after restore when the Longhorn `Volume` CR already exists; avoids clobbering Volume spec):

```bash
helm template [HELMRELEASE_NAME] helm/generic-app -f /tmp/[APP_NAME]-helm-values.yaml --namespace [NAMESPACE] \
  | yq ea 'select((.kind == "PersistentVolume" or .kind == "PersistentVolumeClaim") and .metadata.name == "[LONGHORN_VOL]")' - \
  | kubectl apply -f -
```

**Multiple Longhorn volumes in one app** (e.g. `bazarr-config` and `bazarr-models`): extend the name predicate, for example:

```bash
  | yq ea 'select((.kind == "PersistentVolume" or .kind == "PersistentVolumeClaim")
      and (.metadata.name == "bazarr-config" or .metadata.name == "bazarr-models"))' - \
```

**Backup URL from the cluster** (when you need the `fromBackup` string for `kubectl patch`—**`lastBackup` is not always the backup you want**):

```bash
bid=$(kubectl get volumes.longhorn.io [LONGHORN_VOL] --namespace longhorn-system -o jsonpath='{.status.lastBackup}')
kubectl get backups.longhorn.io "${bid}" --namespace longhorn-system -o jsonpath='{.status.url}{"\n"}'
```

Notes:

- For a single Longhorn volume named `plex-config`, `[LONGHORN_VOL]` is `plex-config` and the PV/PVC metadata names match that name.
- Apply the rendered YAML with `kubectl apply -f` (or pipe). SMB volumes in the same HelmRelease also render as PV/PVC; **filter by `metadata.name`** so you only apply Longhorn resources for the volume(s) you intend.

# Related repository assets

- `helm/generic-app/templates/storage-longhorn.yaml` — canonical PV/PVC/Longhorn Volume shape.
- `scripts/longhorn/bulk-restore-from-backup.sh` — bulk candidate restore; **waits for PVC to reappear** after delete without reconciling Helm. For `generic-app` static PV/PVC, use **Helm reconcile + render/apply** as above instead of relying on that wait alone.
- `scripts/longhorn/README.md` — other Longhorn maintenance scripts.

# Checklist for handoff to another agent

- [ ] `[APP_NAME]`, `[NAMESPACE]`, `[HELMRELEASE_PATH]`, `[LONGHORN_VOL]` (or list of names) confirmed from Git/manifests.
- [ ] Replicas at 0; no pods using the target PVC(s).
- [ ] CNPG / SMB PVCs in the namespace **not** targeted.
- [ ] Backup URL or backup CR known if using `fromBackup` (not only `lastBackup` if you need a specific point in time).
- [ ] Plan for suspend/resume Flux and who runs `flux reconcile`.
- [ ] After restore: PV exists, PVC **`Bound`**, `volumeHandle` on PV matches Longhorn volume name; **Released** Retain PVs from the old binding **deleted** before recreating.
- [ ] **PVC `Bound` before increasing replicas**; if a pod was created while the PVC was missing, delete the pod after the PVC binds.
- [ ] Scale back up and confirm app responds; **Git `app.replicas` matches live scale** (or HelmRelease still suspended intentionally).

# Safety

- Do not run destructive steps against production without explicit approval.
- Rotating or exposing secrets is out of scope; this flow touches storage and workload scale only.
