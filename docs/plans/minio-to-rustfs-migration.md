---
title: "Migrate NAS MinIO consumers to RustFS"
status: active
found_at: 2026-09-07
updated_at: 2026-09-10
area: storage
---

# Migrate NAS MinIO consumers to RustFS

## Goal

Replace NAS MinIO (`http://storage.services.apocrathia.com:9000`) with RustFS
(also on the NAS) as the S3 backend for the observability stack. Buckets and
users are created **manually** on RustFS — the same operational model MinIO
has today. This plan is the tracking surface for the migration itself.

## Scope

**In scope:**

- The three repo-verified MinIO consumers and their five buckets
- Manual bucket + user/policy creation on RustFS
- Per-app cutover: HelmRelease S3 endpoint flips
- Doc-drift cleanup for stale MinIO references
- Decommissioning NAS MinIO after the retention window

**Out of scope:**

- SMB consumers of `storage.services.apocrathia.com` (~40 apps) — same host,
  different protocol; unaffected by this migration
- The in-cluster RustFS (`ate-cache` in `ate-system`) — see
  `substrate-dedicated-rustfs.md`
- RustFS server install/config on the NAS (already running)
- Terraform/OpenTofu management of RustFS (explored and rejected — Decisions #1)
- Historical object migration — optional per app; fresh start is acceptable
  for telemetry backends (retention ages data out anyway)

## Verified facts

Repo audit of `origin/main` @ `5985280d` (2026-09-07) — the complete MinIO
consumer list:

| App   | Buckets                                             | Creds (1Password item) | Manifests                                         |
| ----- | --------------------------------------------------- | ---------------------- | ------------------------------------------------- |
| Loki  | `loki` (chunks + ruler + admin all use it)          | `loki-secrets`         | `flux/manifests/03-services/observability/loki/`  |
| Mimir | `mimir-blocks`, `mimir-ruler`, `mimir-alertmanager` | `mimir-secrets`        | `flux/manifests/03-services/observability/mimir/` |
| Tempo | `tempo`                                             | `tempo-secrets`        | `flux/manifests/03-services/observability/tempo/` |

All three use path-style, insecure HTTP on port 9000; creds flow
`OnePasswordItem` → HelmRelease `valuesFrom` (`access-key-id` /
`access-key-secret`).

Ruled out (hostname/port matches that are **not** MinIO): ~40 apps mount
`//storage.services.apocrathia.com/...` via SMB (media \*arr stack, immich,
icloudpd, comfyui, duckdb, romm, cryptpad, kiwix, rclone, jupyterhub,
mcp-servers, games); authentik/mealie/thelounge/bazarr port-9000
coincidences; jetkvm → Cloudflare R2; Longhorn backup target is CIFS;
substrate already on in-cluster RustFS (`ate-cache`); no velero; zero CNPG
`barmanObjectStore` refs; in-cluster MinIO (`minio-system`) already
decommissioned.

Live endpoint (verified 2026-09-10, SigV4 ListBuckets with the root
credentials):

- RustFS S3 + admin API: `http://storage.services.apocrathia.com:9009` (host
  port; k3s NodePort 30293 fronts the same instance — prefer the fixed host
  port). `/health` reports `rustfs-endpoint`, ready.
- Clean slate: zero buckets. Root credentials verified working.
- NAS MinIO still serves 9000 (S3) + 9002 (console), untouched.
- The RustFS console is **not** exposed on the LAN (port scan: only
  9009/30293 answer for RustFS). User/bucket creation needs either console
  access via port-forward, or the admin API (`/rustfs/admin/v3/`: `add-user`,
  `add-canned-policy`, `set-user-or-group-policy` — verified in RustFS e2e
  tests).
- RustFS server is `1.0.0-beta.12` (NAS build, 2026-07-30); pre-stable —
  expect surface changes.
- Data locations (NAS): MinIO root `/mnt/Pool/Backup/minio`; RustFS root
  `/mnt/Pool/Backup/S3` (relocated 2026-09-11 from
  `/mnt/Pool/Storage/Library/S3` — operator moved it out of the Library SMB
  share; folder now rustfs-only).
- On-disk formats differ between MinIO and RustFS (rustfs#2212); only the
  in-place binary-swap path reads MinIO dirs, and only for some configs. A
  file-level move into the RustFS root is unsupported and will not register
  objects.

## Decisions

| #   | Decision         | Choice                                                                                                                                    | Why                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Management model | Manual (console / admin API), same as MinIO                                                                                               | Five buckets + three one-time users is not enough surface to justify a Terraform stack against a self-hosted, pre-1.0 service. The TF route was built and validated, then backed out: the aws provider cannot manage users (the S3 protocol has no user-management operations) and the rustfs-native provider stores user secrets in state. Revisit if the surface grows or the provider gains write-only secrets. |
| 2   | Identities       | Recreate the SAME access keys + secrets as the current MinIO users (values already in `loki-secrets` / `mimir-secrets` / `tempo-secrets`) | Cutover becomes endpoint-only: no 1Password edits, HelmReleases just point at `:9009`. Both systems accept the same creds during the overlap window; MinIO is decommissioned at the end.                                                                                                                                                                                                                           |
| 3   | Policy shape     | `s3:*` scoped to each app's buckets + objects (JSON below)                                                                                | Telemetry backends need broad CRUD + list + multipart; narrower action lists have caused churn on MinIO in the past. One statement per app.                                                                                                                                                                                                                                                                        |
| 4   | Cutover order    | Tempo → Loki → Mimir, one app at a time                                                                                                   | Least-queried first (traces), most-queried last (metrics); each step is rollback-able by reverting the endpoint.                                                                                                                                                                                                                                                                                                   |
| 5   | Data history     | Migrate history per bucket with `rclone copy` over the S3 API (loopback, on the NAS)                                                      | Operator wants history (2026-09-10). File-level moves do NOT work: MinIO and RustFS on-disk formats differ (rustfs#2212 — in-place binary swap is the only file-level path and only for some MinIO configs); on-disk objects are chunked + metadata-wrapped, and RustFS will not register foreign files. API copy is the supported route (RustFS's own migration guide uses mc/rclone).                            |
| 6   | Root credentials | Rotate after cutover; store in `rustfs-root-secrets`; emergency-only                                                                      | Root was used only for verification. Rename the existing `rustfs-terraform-secrets` item (it holds root in its standard fields and is referenced by nothing now) or create `rustfs-root-secrets` and delete the old item.                                                                                                                                                                                          |

## Steps

- [x] Consumer inventory from `origin/main` (2026-09-07) — table above
- [x] Endpoint + root credentials verified (2026-09-10)
- [x] Create 5 buckets: `loki`, `mimir-blocks`, `mimir-ruler`,
      `mimir-alertmanager`, `tempo` (admin API, 2026-09-10; recreated at the
      relocated root 2026-09-11 after the move wiped state)
- [x] Create users `loki` / `mimir` / `tempo` with the same access key +
      secret as the current MinIO items; per-app policies attached
      (admin API, 2026-09-10 — verified: object roundtrip in own buckets
      PASS, cross-bucket + bucket-creation 403)
- [ ] Cutover per app (tempo, then loki, then mimir): flip the HelmRelease
      S3 endpoint to `http://storage.services.apocrathia.com:9009`,
      reconcile, verify fresh data lands (Grafana Explore over the last 15m)
      and the RustFS bucket grows
- [ ] Migrate history per app — run ON the NAS (rclone ships with TrueNAS;
      loopback keeps traffic local; per-app creds are identical on both
      endpoints, so one pair drives both sides):

      ```bash
      # one-time: two remotes, no creds stored in config (creds come from env)
      rclone config create minio type s3 endpoint http://localhost:9000 force_path_style true
      rclone config create rustfs type s3 endpoint http://localhost:9009 force_path_style true

      # per bucket — pull creds from 1Password (loki/mimir/tempo items)
      export RCLONE_S3_ACCESS_KEY_ID=…
      export RCLONE_S3_SECRET_ACCESS_KEY=…
      rclone copy -P --transfers 16 minio:loki rustfs:loki
      ```

      `copy` (never `sync`/`--delete`): after cutover the RustFS bucket holds
      newly-written objects that a sync would want to delete. Run the copy
      again post-flip to catch the pre-flip delta — it skips identical
      objects.

- [ ] Rotate the RustFS root credentials (NAS-side); store in
      `rustfs-root-secrets` (emergency-only)
- [ ] Doc drift fixes: remove the stale `minio.yaml` HelmRepository section
      from `flux/manifests/01-bootstrap/helm/README.md`; fix the MinIO backup
      claims in `flux/manifests/02-infrastructure/longhorn/README.md` (actual
      target is CIFS); fix the in-cluster-MinIO claims in
      `flux/manifests/03-services/observability/README.md`
- [ ] After the retention window on the last cutovered bucket: decommission
      NAS MinIO (operator-led, on the NAS)
- [ ] Close this plan when MinIO is decommissioned (delete per plans README)

## Feedback loop

- `rclone lsd` or `aws --endpoint-url http://storage.services.apocrathia.com:9009 s3 ls`
  — bucket reality check (read-only)
- Post-cutover: Grafana Explore over the last 15 minutes (logs/traces/metrics)
  - bucket size trending up
- Flux read-only: `kubectl get helmrelease -n observability` (mutations are
  operator-led)

## Notes

- RustFS does **not** implement the MinIO admin API — `mc admin` and the
  aminueza/minio Terraform provider do not work against it. The RustFS CLI
  (`rc`) uses the same native admin API.
- New RustFS consumer (not a MinIO migrant): bucket `kopia` + user/policy
  from `kopiur-secrets` for the kopiur backup pilot (created 2026-09-10,
  verified; Longhorn CIFS backup replacement). Unaffected by MinIO
  decommissioning. kopiur's first mover run is HELD pending the data-root
  relocation decision — the bucket stays empty on purpose.
- Per-app policies attach to the user at creation (console) or via
  `set-user-or-group-policy` (admin API).
- Relocation post-mortem (2026-09-11): moving the data root directory WIPED
  RustFS state — bucket metadata AND IAM users/policies (service stayed
  healthy; HEAD kopia 404, app creds InvalidAccessKeyId). All buckets were
  empty by design, so nothing was lost; everything was recreated via the
  admin API recipe (~2 min) and re-verified. If the root must move again:
  stop writes, rclone data out, move, recreate buckets + users + policies,
  rclone data back — or snapshot the whole root as a unit. RustFS keeps all
  cluster state in the root, not just object data.
- Known wart (2026-09-10): non-root `ListBuckets` returns
  `500 errBucketMetadataNotInitialized` on this build (NAS runs
  `1.0.0-beta.12`, build 2026-07-30). Per-bucket operations all work
  (HEAD/PUT/GET/DELETE verified), and telemetry apps operate on known bucket
  names, so this is cosmetic for the migration. Filtered-ListBuckets fixes
  landed upstream in rustfs#5726 / #5688 — a NAS-side RustFS update may clear
  it. Root ListBuckets works.

### Per-app policy JSON

loki:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": ["arn:aws:s3:::loki", "arn:aws:s3:::loki/*"]
    }
  ]
}
```

mimir:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": [
        "arn:aws:s3:::mimir-blocks",
        "arn:aws:s3:::mimir-blocks/*",
        "arn:aws:s3:::mimir-ruler",
        "arn:aws:s3:::mimir-ruler/*",
        "arn:aws:s3:::mimir-alertmanager",
        "arn:aws:s3:::mimir-alertmanager/*"
      ]
    }
  ]
}
```

tempo:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": ["arn:aws:s3:::tempo", "arn:aws:s3:::tempo/*"]
    }
  ]
}
```
