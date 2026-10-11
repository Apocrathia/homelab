---
title: "RustFS secret normalization: census, root-item rename"
status: draft
found_at: 2026-09-11
updated_at: 2026-10-10
area: storage
---

# RustFS secret normalization: census, root-item rename

## Goal

Normalize 1Password naming for S3/RustFS credentials: codify the two naming
rules and rename the RustFS root item. The census was delivered in chat
2026-09-11 (session 01a090e9) and never filed; this plan is the repo copy,
with every claim re-verified against `origin/main` @ `2a7b1bc7d` on
2026-10-10.

## Scope

**In scope:**

- Standing naming rules codified in
  [`docs/configuration-patterns.md`](../configuration-patterns.md)
  ("Object Storage Credentials")
- Vault rename `rustfs-terraform-secrets` -> `rustfs-root-secrets` plus
  field normalization (operator-gated vault writes)
- Repo-side rename diff for the two files that reference the root item
  (this change)

**Out of scope:**

- Renaming `agent-substrate-secrets` to `substrate-secrets` — superseded:
  [`docs/plans/substrate-dedicated-rustfs.md`](./substrate-dedicated-rustfs.md)
  decision #8 deliberately keeps the existing item
- Rotating the RustFS root credentials themselves (open NAS-side step on
  [`docs/plans/minio-to-rustfs-migration.md`](./minio-to-rustfs-migration.md);
  rotation can ride the same vault sitting — see Steps)
- `longhorn-backup-target-secret` (live CIFS backup target; delete it only
  when kopiur replaces the Longhorn backup job — not part of this plan)
- jetkvm R2 wiring: the README documents optional `r2-*` fields that were
  never provisioned; if R2 is ever wired, provision
  `access-key-id` / `access-key-secret` (keep `r2-endpoint` / `r2-bucket`
  prefixed — they are not credentials)

## Census (verified 2026-10-10 at `origin/main` `2a7b1bc7d`)

Live S3 consumers and their 1Password items:

| Consumer                                                             | Endpoint                                                 | 1Password item             | Credential fields                                                                      |
| -------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------- |
| Loki                                                                 | NAS RustFS `storage.services.apocrathia.com:9009`        | `loki-secrets`             | `access-key-id` / `access-key-secret`                                                  |
| Mimir                                                                | NAS RustFS `:9009`                                       | `mimir-secrets`            | `access-key-id` / `access-key-secret`                                                  |
| Tempo                                                                | NAS RustFS `:9009`                                       | `tempo-secrets`            | `access-key-id` / `access-key-secret`                                                  |
| Substrate `atelet` + `ate-cache`                                     | in-cluster `ate-cache.ate-system.svc.cluster.local:9000` | `agent-substrate-secrets`  | `access-key-id` / `access-key-secret` (one item feeds server root + client)            |
| kopiur backup plane (`ClusterRepository/nas-rustfs`, bucket `kopia`) | NAS RustFS `:9009`                                       | `kopiur-secrets`           | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` + `KOPIA_PASSWORD`                       |
| Tenzir SIEM export (bucket `tenzir`)                                 | NAS RustFS `:9009`                                       | `tenzir-secrets`           | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (+ `discord-webhook-url`, not S3)        |
| NAS RustFS root (vault-only)                                         | -                                                        | `rustfs-terraform-secrets` | `username` / `credential` + duplicated legacy `root-access-key` / `root-access-secret` |

Root-item references in the repo (both updated by this change):

- [`docs/infrastructure/rustfs-bucket-user-creation.md`](../infrastructure/rustfs-bucket-user-creation.md) —
  facts bullet + the `op item get` snippet the onboarding scripts copy
- [`docs/plans/minio-to-rustfs-migration.md`](./minio-to-rustfs-migration.md) —
  decision #6 (the rename decision itself)

## Decisions

| #   | Decision                  | Choice                                                              | Why                                                                                                                                             |
| --- | ------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Naming rules              | `<app>-secrets` items; `access-key-id` / `access-key-secret` fields | De-facto standard of every live consumer; codified in `docs/configuration-patterns.md`. Env-projecting consumers keep `AWS_*` as the exception. |
| 2   | Rename over delete+create | `op item edit --title`                                              | The item holds the only working RustFS root identity (migration plan decision #6); the values must survive the rename.                          |
| 3   | Vault writes              | Operator-gated                                                      | No agent vault mutation; vault edits run in an operator-supervised sitting.                                                                     |
| 4   | Execution order           | Vault rename + field normalization first, then merge the repo diff  | The runbook's scripts read the item; repo and vault must move in one sitting so no onboarding run breaks.                                       |

## Steps

- [x] Census delivered 2026-09-11 (session 01a090e9); filed as this plan and
      codified in `docs/configuration-patterns.md` (this change)
- [x] Rename diff for the two repo files referencing the root item (this
      change; staged, not executed)
- [ ] **Operator: rename the root item** —
      `op item edit "rustfs-terraform-secrets" --title "rustfs-root-secrets"`
- [ ] **Operator: normalize its fields** — rename `username` ->
      `access-key-id` and `credential` -> `access-key-secret`; delete the
      duplicated legacy `root-access-key` / `root-access-secret` fields
      (1Password app edit, or `op item edit` assignment statements; values
      must not transit chat or command args)
- [ ] Merge this branch's repo diff immediately after the vault edits so the
      runbook and the vault stay in sync
- [ ] Optional: strip the stale `r2-key-id` / `r2-access-key` fields from
      `cloudflare-terraform-secrets`
- [ ] Optional: rotate the RustFS root credentials (NAS-side) and store the
      rotated pair in `rustfs-root-secrets` — closes the open rotation step
      on `docs/plans/minio-to-rustfs-migration.md`
- [ ] Close this plan when the rename is executed (delete per plans README)

## Feedback loop

- `op item list --format json` — read-only vault state check (needs a
  signed-in `op` session)
- `git grep -n "rustfs-terraform-secrets\|rustfs-root-secrets" origin/main` —
  repo references before/after the rename
- Next RustFS onboarding run: the
  [runbook](../infrastructure/rustfs-bucket-user-creation.md) scripts must
  read the new item name and fields on the first try

## Notes

- Field-style exception: env-projecting consumers (kopia's AWS chain,
  Tenzir's `to_s3` default AWS chain) keep `AWS_ACCESS_KEY_ID` /
  `AWS_SECRET_ACCESS_KEY`; the pattern doc records this as the sanctioned
  exception. `secretKeyRef` consumers (loki/mimir/tempo/substrate) use
  `access-key-id` / `access-key-secret`.
- The 2026-09-11 census claimed the root item was "referenced by nothing";
  the runbook landed 2026-09-14 and reads it, so the repo diff ships in
  lockstep with the vault rename (decision #4).
- Vault reads for the 2026-10-10 verification come from the same-day board
  evidence (worker-b, read-only `op item list`); the host `op` daemon
  session had expired by the time this plan was drafted (sign-in is
  operator biometric).
- Stale fields on the live `cloudflare-terraform-secrets` item
  (`r2-key-id` / `r2-access-key`, from the never-wired R2 plan): optional
  cleanup in the same vault sitting.
