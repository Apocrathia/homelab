---
title: "Deploy OpenCTI threat-intelligence platform"
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

# Deploy OpenCTI threat-intelligence platform

## Problem / desired state

The homelab has no threat-intelligence platform. Desired state: OpenCTI
runs in-cluster via the devops-ia/helm-opencti chart under
`flux/manifests/04-apps/security/opencti/`, with a single-node OpenSearch
subchart on Longhorn, dragonfly (redis), bitnami RabbitMQ, S3 file storage
on the NAS rustfs bucket `opencti-files`, a worker Deployment, a Gateway API
HTTPRoute at `opencti.gateway.services.apocrathia.com`, and Authentik OIDC
for SSO.

Full scoping and the slice plan live in
[`docs/research/misp-opencti-deployment.md`](../research/misp-opencti-deployment.md)
— the research entry is the design source of truth; this issue tracks
delivery only.

## Acceptance

Slice 1 — storage + secrets foundation:

- rustfs bucket `opencti-files` exists with a bucket-scoped,
  self-identifying (`OPENCTI…`) user; scoping battery green (in-bucket
  PUT/GET/DELETE 200, cross-bucket 403, bucket-create 403)
- 1Password item `opencti-secrets` carries everything for the app (admin
  email/password/token, RabbitMQ password, redis password, the rustfs
  keys for `opencti-files` as MINIO**ACCESS_KEY/MINIO**SECRET_KEY) per the
  single-item-per-app pattern; the former split item
  `opencti-files-secrets` was consolidated away and archived (2026-10-11)

Slice 4 — OpenCTI deploy (no SSO):

- `/health?health_access_key=…` returns green
- MITRE seeded entities land
- file import writes an object into the `opencti-files` bucket (the rustfs
  S3-compatibility smoke test, research §2.6)
- `kustomize build` clean; Trivy on changed paths green
- websockets work through the Cilium gateway

Slice 5 — OpenCTI SSO:

- "Login with Authentik" flow works end-to-end; first OIDC login creates the
  user in the mapped group; logout OK; local strategy kept as break-glass

Slice 6 — MISP connector (joint with the MISP issue):

- within one poll interval (`PT5M`) a test MISP event with indicators
  appears in OpenCTI as a report with indicators/observables (connector
  dashboard success counts)

Slice 7 — Tenzir handoff (sibling lane, coordination only):

- export surface chosen (TAXII 2.1 collection vs live stream vs rustfs STIX
  file-drop) and the intake row spec handed to the sibling lane; their
  acceptance, not ours.

## Feedback loop

- `kustomize build flux/manifests/04-apps/security/opencti`
- Trivy on changed paths; gitleaks on the worktree diff
- rustfs scoping battery with the `opencti-files` user creds (slice 1)
- platform `/health` endpoint + connector dashboard (slices 4/6)

## Implementation hint

Research doc sections 2.3 (stack/sizing), 2.4 (chart), 2.5 (OIDC), 2.6
(rustfs fit), 5 (slice plan). Pin the chart version — OpenCTI releases
near-daily with date-based versions; ride appVersion bumps deliberately,
consider the LTS app lines.

## Notes

- Secrets live only in 1Password. `opencti-secrets` field labels match the
  devops-ia chart's env style (docker `.env.sample` uses
  `OPENCTI_ADMIN_*`; the chart's `application.env` uses `APP__*`):
  `APP__ADMIN__EMAIL`, `APP__ADMIN__PASSWORD`, `APP__ADMIN__TOKEN` (UUIDv4),
  `APP__ENCRYPTION_KEY` (base64 32 bytes), `RABBITMQ__PASSWORD`,
  `REDIS__PASSWORD`, `MINIO__ACCESS_KEY`, `MINIO__SECRET_KEY` (the last two
  are the rustfs keypair for `opencti-files`). Slice 5 adds `OIDC_CLIENT_SECRET` (authentik OIDC
  client secret; the client_id is pinned to `opencti` in `authentik.tf` —
  the canonical file pair: `crossplane.yaml` carries the Crossplane
  objects, `authentik.tf` is the single source of truth for the HCL,
  stitched into the Workspace at kustomize build time — so
  only the secret is copied post-merge; the HCL never sets it, authentik
  generates the secret server-side).
- The `opencti-misp-connector` 1Password item is deferred to slice 6 (wired
  there): a single field `MISP_KEY` holding the MISP auth key, minted in the
  MISP UI post-merge (dedicated read-only user, org `Apocrathia`) and
  materialized in-cluster by the OnePasswordItem in `opencti/secret.yaml`.
  Until the operator creates the item the connector pod waits on the
  missing Secret — the same intended step-0 ordering as the OIDC client
  secret.
- `REDIS__PASSWORD` follows the chart's `SECTION__KEY` env style; the exact
  redis auth wiring (env override vs `REDIS_URL`) is confirmed at slice 4 —
  renaming a vault field label then is trivial.

## Operator pre-deploy checklist

- `vm.max_map_count` decision (research operator gate 3): Talos
  machine-config patch in `talos/**` (protected path) vs the opensearch
  chart's privileged `sysctlInit` initContainer. Needed before slice 4;
  cluster-wide blast radius — operator call.
- Confirm OpenSearch heap sizing (3–4 Gi single node, research risk 3).
- Pick the OpenCTI update cadence at slice 4 (date-based rolling vs LTS app
  lines, research risk 7).
- DNS/external steps: none — external-dns watches `gateway-httproute`.

## Post-merge operator checklist (slice 5)

- First-plan check: the first plan after merge MUST read as a clean
  create-set (provider + application + admins binding — nothing else,
  nothing partial). A read-only plan against live authentik is the
  authorized post-merge step; it is not run before the merge. Fresh
  create — no import blocks, no adoption ids; if the state Secret is ever
  lost, re-adopt via manual `tofu import` — never a blip.
- Copy the generated OIDC client secret from the authentik UI
  (`opencti-oidc-provider`) into the `opencti-secrets` 1Password item field
  `OIDC_CLIENT_SECRET`, then restart the platform deployment (the secret is
  generated server-side by authentik; it is never stored in this repo).
- Live SSO acceptance: "Login with Authentik" works end-to-end; first OIDC
  login creates the user in the mapped group (authentik `admins` → OpenCTI
  `Administrators`); logout OK (local); local admin login still works as
  break-glass.

## Post-merge operator checklist (slice 6)

- Mint the MISP auth key: MISP UI → dedicated read-only user (org
  `Apocrathia`; org-only distribution events are visible only to same-org
  users) → Auth Keys → Add key (label `opencti-connector`). Copy the key
  into the `opencti-misp-connector` 1Password item, field `MISP_KEY` (the
  item is created at this point, per the slice-1 deferral). The
  OnePasswordItem in `opencti/secret.yaml` then syncs the in-cluster Secret
  and the `opencti-misp-connector` pod starts; restart it if backoff was
  exhausted. Until this step the pod waits on the missing Secret — by
  design (same step-0 pattern as the OIDC client secret).
- Live acceptance (joint with the MISP issue): create a test MISP event with
  indicators; within one poll interval (`PT5M`) it appears in OpenCTI as a
  report with indicators/observables; the connector dashboard (Data →
  Ingestion → Connectors → MISP) shows success counts.

## Post-merge operator checklist (slice 7 — when the SIEM lane asks)

- No standing action until the sibling lane opens their intake row. When they
  do: create a dedicated **read-only OpenCTI user**, then under
  Data → Data sharing create a TAXII 2.1 collection (or a live stream /
  CSV feed) scoped with filters, and hand the sibling lane the URL + the
  token (tokens are UI-generated post-merge; nothing lives in Git). Feed
  access control decides data visibility — a public feed impersonates the
  chosen user's markings/organizations, so keep that user minimal.
