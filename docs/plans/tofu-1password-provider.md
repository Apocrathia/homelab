---
title: "OpenTofu secrets via 1Password provider"
status: active
found_at: 2026-07-26
updated_at: 2026-07-26
area: security
---

# OpenTofu secrets via 1Password provider

## Goal

Stop duplicating provider credentials across `terraform/.env` and GitLab CI
variables. **1Password is the secret store.**

Pattern:

1. **Bootstrap** — GitLab (and local) hold **Connect** credentials only:
   `OP_CONNECT_HOST` + `OP_CONNECT_TOKEN`. No `op` CLI in CI.
2. **Resolve** — OpenTofu `1Password/onepassword` **ephemeral** items feed
   other providers (GitLab first; later Cloudflare / Proxmox / Okta).
3. **Migrate** — delete duplicated GitLab CI secrets as each consumer moves.

**Prove first** on the GitLab stack (read-only project data, then
`managed-by-terraform` label).

Do **not** commit vault UUIDs — vault **name** in HCL only.

## Scope

**In scope:**

- GitLab stack: Connect → onepassword ephemeral → `gitlabhq/gitlab` provider
- Vault identity via **name** (e.g. `Secrets`) — **no vault UUID in git**
- Item titles (non-secret) in HCL; secret **values** never in git
- Prefer `CI_JOB_TOKEN` for HTTP state / MR notes where possible
- After spike: same pattern for Cloudflare / Proxmox / Okta
- Docs; retire `sync-gitlab-ci-variables.sh` for provider tokens

**Out of scope:**

- Service-account + `op` CLI path for tofu CI (rejected: SA still needs `op`)
- Custom `with-op` / zip bootstrap scripts
- Syncing secrets into `gitlab_project_variable` as the long-term bus
- `data.onepassword_item` for credentials (persists in remote state)
- Cluster Connect Operator redesign (use existing Connect)
- Commit / cluster mutate without operator authorization

## Decisions

- Auth — **1Password Connect** (`OP_CONNECT_HOST` + `OP_CONNECT_TOKEN`) —
  provider talks HTTP to Connect; **no `op` binary** in the runner. Host:
  in-cluster Service
  `http://onepassword-connect.onepassword-system.svc:8080` (runners are on
  the cluster; ingress for Connect is not enabled).
- Why not SA-only — provider still shells out to `op` for
  `OP_SERVICE_ACCOUNT_TOKEN` today; Connect is the no-CLI path.
- GitLab blast — Connect token is still a project CI var (visible to other
  jobs). Prefer a Connect token scoped to the vaults tofu needs; do not also
  store provider PATs in GitLab.
- Vault UUID — **not in git**. `data.onepassword_vault` by name.
- State in CI — prefer `gitlab-ci-token` + `CI_JOB_TOKEN` (later spike).
- Never — TF → GitLab variable sync as the secret bus; never
  `data.onepassword_item` for these tokens while state is in GitLab.

## Steps

### Phase 0 — Inventory + Connect + GitLab pattern spike

- [x] Scaffold `terraform/providers/gitlab.hcl` (ephemeral → gitlab).
- [x] Scaffold `terraform/modules/gitlab-project` + `deployments/gitlab/homelab`.
- [x] Vault by name (`data.onepassword_vault`); no UUID in git.
- [x] Switch auth to **Connect**; remove `with-op.sh` / `ci_op_bootstrap`.
- [x] Wire tofu CI preflight for `OP_CONNECT_HOST` / `OP_CONNECT_TOKEN`
      (host defaulted in YAML).
- [ ] Fill inventory: GitLab PAT item **title** (vault name `Secrets`).
- [ ] Ensure Connect token can read that vault; set GitLab CI
      `OP_CONNECT_TOKEN` (masked/protected). Host is the in-cluster Service
      (defaulted in tofu CI YAML).
- [x] CI engine / local OpenTofu support ephemeral.
- [ ] Spike A — GitLab stack:
  - ephemeral → `provider "gitlab"`
  - Step 1: read-only `data.gitlab_project`
  - Step 2: label `managed-by-terraform`
  - Success = no GitLab PAT / vault UUID in env or git; only Connect + state
    bootstrap
- [ ] Spike B/C — `CI_JOB_TOKEN` for state / MR notes.
- [ ] If Connect→ephemeral→provider fails, stop — do not stuff PATs back into
      GitLab CI.

### Phase 1 — Harden GitLab stack (post-spike)

- [ ] Keep module scope to: project data + `managed-by-terraform` label.
- [ ] Docs; CI green with Connect + job-token state once Spike B lands.

### Phase 2 — Cloudflare / Proxmox / Okta

- [ ] Same Connect + ephemeral pattern per provider secret.
- [ ] Strip those keys from GitLab CI vars and from the sync script.

### Phase 3 — CI bootstrap cleanup

- [ ] Prefer `CI_JOB_TOKEN` for HTTP state when present.
- [ ] Switch MR comment curls to job token if Spike C passed.
- [ ] Local README: Connect env + `terragrunt` (no wrapper script).

### Phase 4 — Docs and cutover

- [ ] Rewrite env / CI sections as needed.
- [ ] Delete or gut `sync-gitlab-ci-variables.sh`.
- [ ] Remove obsolete GitLab secret variables.
- [ ] Stop storing provider tokens in `terraform/.env`.

## Feedback loop

- Spike A step 1: `terragrunt plan` on gitlab stack with Connect env only
- Spike A step 2: apply creates `managed-by-terraform` on `Apocrathia/homelab`
- No `op` binary required in tofu jobs
- State file: no secret material from 1Password data sources
- Later: `glab variable list` without Proxmox/Cloudflare/Okta tokens

## Notes

### Why GitLab as the test provider

- Low blast radius vs DNS / VMs / Okta
- Dual-provider pattern (onepassword + target)
- On-ramp to GitLab-as-code
- First mutate: label `managed-by-terraform`

### Spike status (2026-07-26)

| Check                       | Result                                |
| --------------------------- | ------------------------------------- |
| Auth mode                   | **Connect** (no `op` in CI)           |
| Vault UUID in git           | **No** — name `Secrets`               |
| `with-op` / zip bootstrap   | **Removed**                           |
| Spike A                     | Blocked on Connect token + item title |
| Connect reachable from SaaS | Operator must confirm                 |

### Inventory (fill in)

| Consumer           | Today                  | 1Password item | Field | Mechanism            |
| ------------------ | ---------------------- | -------------- | ----- | -------------------- |
| GitLab provider    | (new; PAT)             |                |       | ephemeral → provider |
| Cloudflare         | `CLOUDFLARE_API_TOKEN` |                |       | ephemeral → provider |
| Proxmox            | `PROXMOX_VE_API_TOKEN` |                |       | ephemeral → provider |
| Okta               | `OKTA_API_TOKEN`       |                |       | ephemeral → provider |
| HTTP state (CI)    | `TF_HTTP_PASSWORD`     | —              | —     | `CI_JOB_TOKEN`       |
| HTTP state (local) | `TF_HTTP_PASSWORD`     | (PAT item)     |       | local env only       |
| MR comments (CI)   | `TOFU_TOKEN`           | —              | —     | prefer job token     |

### Operator checklist

1. Connect API token with read on vault `Secrets` → GitLab
   `OP_CONNECT_TOKEN` (masked/protected). Host defaults in tofu CI YAML to
   `http://onepassword-connect.onepassword-system.svc:8080`.
2. Confirm in-cluster runners resolve that Service (API port 8080).
3. GitLab PAT item in that vault (API Credential → credential field); set
   `onepassword_gitlab_pat_item_title` in
   `terraform/deployments/gitlab/homelab/terragrunt.hcl`.
4. Local: port-forward Connect (or NodePort) then same `OP_CONNECT_*` +
   `TF_HTTP_*`; `terragrunt plan` in the deployment dir
   (`manage_terraform_label = false` until green).

### Follow-on

Expand GitLab module beyond the label. Same Connect + ephemeral pattern to
migrate other tokens out of GitLab CI.
