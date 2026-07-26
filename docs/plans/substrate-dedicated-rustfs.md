# Dedicated RustFS for Agent Substrate snapshots

## Goal

Move Agent Substrate's golden-snapshot object storage off the `substrate`
chart's bundled RustFS and onto `ate-cache` — a dedicated, repo-owned RustFS
deployed with `helm/generic-app` into `ate-system`. Credentials come from
1Password and reach `atelet` as `secretKeyRef`, never as plaintext.

## Why

The bundled RustFS cannot survive a Helm upgrade that touches its pod template
(`substrate-0-0-10-rollout-failure.md`, now closed — see git history):

- `Deployment/rustfs` is `RollingUpdate` on a ReadWriteOnce Longhorn PVC, so the
  replacement pod hits `Multi-Attach error` and the rollout never converges.
- `Job/rustfs-bucket-init` has an immutable pod template and no Helm hook, so
  server-side apply fails on every retry once its env changes.

This blocks chart version bumps _and_ credential rotation. Setting
`rustfs.enabled=false` deletes both offending resources; every Deployment left
in the chart is stateless, so upgrades stop deadlocking.

## Verified facts

Rendered from chart `substrate` 0.0.6 (`helm template`, artifacts in
`.scratch/`):

| Check                                                   | Result                                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `rustfs.enabled=false` removes RustFS Deployment + Job  | Yes — remaining Deployments are ateapi, ate-controller, atenet-dns, atenet-router |
| `atelet.extraEnv` accepts `valueFrom.secretKeyRef`      | Yes — renders verbatim into the DaemonSet                                         |
| Plaintext `rustfsadmin` anywhere in render              | None                                                                              |
| `generic-app` default update strategy                   | `Recreate` — explicitly "to avoid Multi-Attach errors"                            |
| `generic-app` supports Longhorn + 1Password + ClusterIP | Yes (`storage.longhorn`, `secrets.enabled`, `authentik/httproute: false`)         |
| Current data volume                                     | 18 objects, ~127 MB, in bucket `ate-snapshots` on a 1Gi PVC                       |

The `atelet` → S3 contract (env names the chart already uses):

```yaml
ATE_STORAGE_BACKEND: s3 # set by atelet.storageBackend
AWS_ENDPOINT_URL: <endpoint>
AWS_S3_USE_PATH_STYLE: "true"
AWS_REGION: us-east-1
AWS_ACCESS_KEY_ID: <secretKeyRef>
AWS_SECRET_ACCESS_KEY: <secretKeyRef>
```

RustFS server config: `RUSTFS_ADDRESS=:9000` (API),
`RUSTFS_CONSOLE_ADDRESS=:9001` (console), `RUSTFS_VOLUMES=/data`,
`RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY` for the root identity. RustFS supports
a read-only root filesystem; `/data` and `/logs` are the only writable paths it
needs, and leaving `RUSTFS_OBS_LOG_DIRECTORY` unset sends logs to stdout.

The bundled pod runs as uid/gid `10001`; the dedicated one matches so the
Longhorn volume ownership lines up.

## Decisions

| #   | Decision      | Choice                                                                                                    |
| --- | ------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Namespace     | `ate-system` — the cache belongs to the substrate, not to itself                                          |
| 2   | App name      | `ate-cache` — matches the chart's `ate-*` prefix and dodges the name collision below                      |
| 3   | Layout        | Inside `substrate/` as `cache-helmrelease.yaml`; the dir already carries two HelmReleases and owns the ns |
| 4   | Volume        | `20Gi`, `numberOfReplicas: 2`                                                                             |
| 5   | Bucket        | Resident sidecar running an idempotent `head-bucket` / `create-bucket` loop against `127.0.0.1:9000`      |
| 6   | Existing data | **Clean start** — no migration; `AgentHarness/openclaw` cold-starts and snapshots regenerate              |
| 7   | Console       | `:9001` on the ClusterIP Service, no HTTPRoute — port-forward only                                        |
| 8   | Secret        | Reuse the existing `OnePasswordItem/agent-substrate-secrets` in `ate-system`; `secrets.enabled: false`    |

### Name collision

The bundled RustFS owns `Deployment/rustfs`, `Service/rustfs`,
`PVC/rustfs-data`, and label `app: rustfs` in `ate-system`, plus Longhorn
`Volume/rustfs-data`. Landing in the same namespace under the name `rustfs`
would collide on all five — including the Deployment selector, so the new
Deployment would adopt the bundled pods. `ate-cache` keeps every name distinct,
which also lets both run side by side during cutover.

Resulting names: `Deployment/ate-cache`, `Service/ate-cache`
(`ate-cache.ate-system.svc.cluster.local:9000`), `PVC/ate-cache-data`, Longhorn
`Volume/ate-cache-data`.

## Steps

1. **Rotate the 1Password item.** Refresh `access-key-id` /
   `access-key-secret` in `vaults/Secrets/items/agent-substrate-secrets`. The
   values from the earlier rotation attempt leaked into Kubernetes Events and
   must not be reused. **Done** — operator rotated before implementation.
2. **Add `ate-cache`.** `substrate/cache-helmrelease.yaml` (generic-app,
   `app.name: ate-cache`, 20Gi Longhorn volume, ClusterIP with `api`/`console`
   ports, `secrets`/`authentik`/`httproute` disabled, bucket-init sidecar), and
   register it in `substrate/kustomization.yaml`.
3. **Apply and verify** `ate-cache` comes up, the volume binds, and the sidecar
   reports `ate-snapshots` ready.
4. **Flip substrate.** In `substrate/helmrelease.yaml`: drop the RustFS
   `valuesFrom`, set `rustfs.enabled: false`, add `atelet.extraEnv` pointing at
   `ate-cache` with `secretKeyRef` creds, and add `ate-cache` to `dependsOn`.
   Reconcile.
5. **Verify substrate.** `atelet` DaemonSet rolls with the new env; suspend and
   resume `AgentHarness/openclaw` and confirm a fresh snapshot object lands in
   the new bucket. **Blocked on 0.0.10** — pinned back to `0.0.6` so agents can
   run; re-verify after a paired kagent lands. See
   `docs/issues/substrate-kagent-version-skew.md`.
6. **Retest the version bump.** With RustFS out of the release, retry chart
   `0.0.10` + `image.tag: v0.0.10`. **Done for converge** — the release holds
   Ready without the RustFS deadlock, but agents cannot use it (proto + JWT).
   Chart/image held at `0.0.6` until the skew issue clears.
7. **Reconcile docs.** **Done** — README updated, resolved issues deleted, the
   remaining upstream gap is tracked in
   `docs/issues/substrate-kagent-version-skew.md`.

## Rollback

Steps 1–3 are additive — the bundled RustFS keeps serving until step 4. To back
out after step 4, restore `rustfs.enabled: true` and the previous `valuesFrom`
block in `substrate/helmrelease.yaml`. Snapshots are regenerable, so there is
nothing to restore.

## Current cluster state

- `HelmRelease/substrate` and `substrate-crds` are pinned to chart `0.0.6` /
  `image.tag v0.0.6` (close Renovate bumps until
  `docs/issues/substrate-kagent-version-skew.md` acceptance passes).
- `HelmRelease/ate-cache` owns the snapshot store in `ate-system`.
- The bundled RustFS is disabled and `atelet` uses
  `ate-cache.ate-system.svc.cluster.local:9000`.
- `OnePasswordItem/agent-substrate-secrets` supplies both server and client
  credentials through `secretKeyRef`.
- Agents should become Ready again once Flux applies the `0.0.6` pin.

## Open risks

- RustFS is `1.0.0-beta.3`. Beta object store holding agent state — acceptable
  for snapshots (regenerable, agents cold-start if lost), not for anything
  authoritative.
- Chart `0.0.10` converges with external RustFS but cannot drive agents until
  the skew in `docs/issues/substrate-kagent-version-skew.md` clears.
- The leaked credential values remain in Kubernetes Events and Helm release
  history in `ate-system` until they age out. Operator accepted this; the keys
  never took effect and RustFS is not reachable outside the cluster.
