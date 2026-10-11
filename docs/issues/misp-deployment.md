---
title: "Deploy MISP threat-intelligence sharing platform"
kind: feature
status: in-flight
severity: medium
source: review
found_at: 2026-10-10
found_by: security-tools
area: security
slice: afk
plan: docs/research/misp-opencti-deployment.md
branch: feat/misp-opencti
---

# Deploy MISP threat-intelligence sharing platform

## Problem / desired state

The homelab has no threat-intelligence platform. Desired state: MISP runs
in-cluster from the official misp-core images via the cmu-sei/misp-helm
chart under `flux/manifests/04-apps/security/misp/`, with MariaDB + valkey
subcharts on Longhorn, a Gateway API HTTPRoute at
`misp.gateway.services.apocrathia.com`, Authentik OIDC for SSO, and MariaDB
backups to rustfs.

Full scoping, chart verdicts, sizing, and the slice plan live in
[`docs/research/misp-opencti-deployment.md`](../research/misp-opencti-deployment.md)
— the research entry is the design source of truth; this issue tracks
delivery only.

## Acceptance

Slice 1 — storage + secrets foundation:

- rustfs buckets `misp-files` and `misp-mariadb-backups` exist with
  bucket-scoped, self-identifying (`MISP…`) users; scoping battery green
  (in-bucket PUT/GET/DELETE 200, cross-bucket 403, bucket-create 403) per
  [`docs/infrastructure/rustfs-bucket-user-creation.md`](../infrastructure/rustfs-bucket-user-creation.md)
- 1Password items `misp-secrets`, `misp-files-secrets`,
  `misp-mariadb-backups-secrets` exist (label-only verification)

Slice 2 — MISP deploy (no SSO):

- `kustomize build` clean; Trivy scan on changed paths green
- pods healthy: misp-core, misp-modules, mariadb, valkey
- `https://misp.gateway.services.apocrathia.com` loads behind the gateway;
  local admin login works (initial creds in 1Password `misp-secrets`)
- default feeds pull succeeds (logs)

Slice 3 — MISP SSO (Authentik OIDC):

- login via Authentik works; role mapping `misp-admin → MISP role 1`
- break-glass local admin preserved (`mixedAuth`)
- blocked-IdP-user caveat handled (`offline_access` +
  `check_user_validity`) — **verified during implementation**: these
  plugin-config keys are not wired by the misp-docker v2.5.44 image (the
  chart envs render but nothing consumes them; repo-wide verified @
  33ac4e6d). Values pinned, behavior documented in the MISP README;
  new logins of blocked users are refused, active sessions/API keys
  require a manual MISP user disable; logout returns to IdP

Slice 6 — MISP → OpenCTI connector (joint with the OpenCTI issue):

- MISP auth key minted at runtime (MISP UI, dedicated read-only user) and
  stored in 1Password item `opencti-misp-connector`, field `MISP_KEY`. Chart
  `setAPIKey` stays off: it requires `setk8sSecrets` and renders the key from
  a plaintext chart value into a chart-managed Secret, and its boot script
  resets a hardcoded `admin@admin.test` authkey every start — the UI-minted
  key keeps 1Password the SSOT (README secrets section has the evidence)

Slice 8 — backups + ops docs:

- MariaDB dump CronJob writes to the `misp-mariadb-backups` bucket; one
  tested restore reproduces a working MISP login
- app README merged (pinned chart, follows chart appVersion deliberately)

## Feedback loop

- `kustomize build flux/manifests/04-apps/security/misp`
- `helm template` (slice 2, after chart pull into `.scratch/`)
- Trivy on changed paths; gitleaks on the worktree diff
- rustfs scoping battery with the `misp-files` / `misp-mariadb-backups`
  user creds (slice 1)
- Flux read-only status checks after each operator apply

## Implementation hint

Research doc sections 1.2 (chart choice), 1.3 (MariaDB verdict), 1.4
(components), 1.5 (sizing), 1.6 (OIDC), 5 (slice plan). The chart has no
published helm index — consume via GitRepository (git-tags Renovate
datasource), same pattern as generic-app.

## Notes

- Secrets live only in 1Password. `misp-secrets`: MariaDB root + app
  passwords, valkey/redis password, initial admin email + password (field
  labels match the misp-docker env names: `MYSQL_ROOT_PASSWORD`,
  `MYSQL_PASSWORD`, `REDIS_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).
  `misp-files-secrets` / `misp-mariadb-backups-secrets`: rustfs keypairs
  (fields `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`).
- The `opencti-misp-connector` 1Password item is deferred to slice 6
  (wired there): single field `MISP_KEY`, minted via the MISP UI post-merge —
  see the slice-6 steps below and the joint checklist in the OpenCTI issue.
- Chart appVersion lags MISP upstream by a few releases (research risk 1) —
  accepted.

## Operator pre-deploy checklist

- Confirm the SMTP relay target for MISP mail at slice 2 (design points at
  the existing homelab mail relay; exact relay is an operator call).
- Everything else is in-band: DNS is automatic (external-dns watches
  `gateway-httproute`), slice-1 vault items are agent-created, and the
  Authentik OIDC provider (slice 3) follows the house per-app pattern.

## Operator post-merge steps (slice 3)

0. First-plan check: the first plan after merge MUST read as a clean
   create-set (provider + custom scope mapping + application + admins
   binding — nothing else, nothing partial). A read-only plan against live
   authentik is the authorized post-merge step; it is not run before the
   merge. Fresh create — no import blocks, no adoption ids; if the state
   Secret is ever lost, re-adopt via manual `tofu import` — never a blip.
1. After the tofu workspace (the canonical file pair: `crossplane.yaml`
   carries the Crossplane objects, `authentik.tf` is the single source of
   truth for the HCL, stitched into the Workspace at kustomize build time)
   creates the provider, copy the
   authentik-generated OIDC client secret (Applications → MISP →
   `misp-oidc-provider`) into the `OIDC_CLIENT_SECRET` field of the
   `misp-secrets` 1Password item. The client_id is pinned (`misp`), so the
   copy is secret-only (the module never sets the client secret — authentik
   generates it server-side). The misp pod waits on the resulting
   `username`/`password` fields in `misp-secrets` until this is done — intended ordering.
2. Live SSO acceptance: authentik login works via the "Login with OIDC"
   button; the authentik `admins` member lands as MISP role 1 (site admin);
   MISP logout returns to the IdP-hosted page.
3. Blocked-user check: a user blocked in authentik is refused a new MISP
   login. Caveat on this image: existing sessions/API keys survive until
   the MISP user is disabled manually (offline_access revalidation is not
   wired by misp-docker v2.5.44 — see the MISP README SSO section).
4. Break-glass: local admin login (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) still
   works after SSO is on (`mixedAuth`).

## Operator post-merge steps (slice 6)

1. Create a dedicated read-only MISP user (org `Apocrathia`), mint an auth
   key (profile → Auth Keys → Add key, label `opencti-connector`), and copy
   it into the `opencti-misp-connector` 1Password item field `MISP_KEY`.
   The OpenCTI-side steps and live acceptance (test event → report within
   `PT5M`) live in the opencti-deployment issue — joint slice 6.
