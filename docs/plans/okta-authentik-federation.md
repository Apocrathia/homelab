---
title: "Okta ↔ Authentik federation (external Okta, lab Authentik)"
status: active
found_at: 2026-07-24
updated_at: 2026-07-25
area: security
---

# Okta ↔ Authentik federation (external Okta, lab Authentik)

## Goal

Give a single human identity path where **external apps use Okta** and **lab
apps keep using Authentik**, with a one-way OIDC hop so a session in Okta can
land the operator in Authentik already authenticated (Okta app tile and
Authentik login-page "Log in with Okta"). Lab SSO must stay usable if Okta is
down: local Authentik accounts remain break-glass; Okta is additive, not the
sole Authentik path.

## Scope

**In scope:**

- Okta OIDC web application for Authentik (`okta_app_oauth`) built into
  `terraform/modules/okta-org`, wired from `terraform/deployments/okta/org/`
- Okta app assignment to the built-in `Everyone` group
- Okta client id/secret as Authentik UI fields on the Okta OAuth Source (not
  blueprint `!Env`, not 1Password / `global.env`)
- Authentik Okta OAuth Source (slug `okta`) as a blueprint ConfigMap for
  non-secret attrs (URLs, flows, matching mode)
- Binding that source into `default-authentication-identification` so the login
  button appears
- Docs: `terraform/README.md` and
  `flux/manifests/03-services/authentik/README.md` pointers (current state
  only; no changelog archaeology)

**Out of scope:**

- Making Authentik the IdP for Okta (`okta_idp_oidc`) — requires exposing
  `auth.gateway.services.apocrathia.com` (today `10.100.1.99`) to Okta SaaS
- Defining or replacing Authentik flows beyond the single `sources` binding on
  the existing identification stage
- Replacing Authentik as IdP for existing lab blueprints (Proxmox, kube-auth,
  etc.)
- Broader external SaaS app catalog in Okta TF (Slack, GitLab.com, …) — later
  plans / MRs
- Okta Verify / authenticator **methods** in TF — provider gap
  ([okta/terraform-provider-okta#1405](https://github.com/okta/terraform-provider-okta/issues/1405));
  push is already ACTIVE in the org; escalate to Okta rep, do not paper over
  with `null_resource` / curl
- Group sync / JIT provisioning polish beyond what the Okta source needs for
  a working login (`user_matching_mode: email_link` links by email)
- Custom Okta authorization server (`/oauth2/default`) — the org authorization
  server covers OIDC SSO, and the free-plan `default` AS ships without an
  access policy
- Cluster mutate or git commit without operator authorization

## Decisions

- Trust model — **Okta = external IdP of record; Authentik = lab IdP** —
  external clients never talk to Authentik; lab clients never talk to Okta
  directly. Reversible by removing the source / OIDC app.
- Federation direction — **Okta upstream → Authentik OAuth Source** — supports
  "already logged into Okta → land in Authentik logged in" without making lab
  apps Okta-dependent. Inverse blocked until Authentik is internet-reachable.
- Dependency posture — **additive + break-glass** — the Okta source does not
  disable local password login; an Okta outage only breaks the Okta button /
  tile path.
- Entry points — **both** Okta app tile and Authentik login-page button — the
  tile deep-links to Authentik's own login-initiation URL, since Authentik
  OAuth sources have no IdP-initiated entry point.
- Protocol — **built-in Authentik `provider_type: okta`** — not generic
  `openidconnect`; Authentik ships Okta as a first-class source type with
  customizable URLs.
- Source slug — **`okta`** — must match callback path
  `/source/oauth/callback/okta/` and login path `/source/oauth/login/okta/`.
- Issuer — **`issuer_mode = CUSTOM_URL`** with discovery at
  `https://okta.apocrathia.com/.well-known/openid-configuration`. Considered
  `ORG_URL` (immune to the custom-domain reset failure mode) and `DYNAMIC`
  (forgiving, harder to reason about). **Hard-to-reverse-ish:** if the Okta
  custom domain is ever disabled, Okta silently resets the app to `ORG_URL`
  and Authentik's issuer validation breaks — see Risks.
- Okta client secret custody — **`omit_secret = true` from the first apply**,
  secret read once from the Okta Admin UI. Considered `omit_secret = false`
  (secret available as a TF output, but persisted plaintext in GitLab-backed
  remote state). **One-way:** flipping `true → false` later force-recreates
  the app with a new client id/secret.
- Assignment — **built-in `Everyone` group** via `data.okta_group`
  (`type = "BUILT_IN"`) plus a singular `okta_app_group_assignment`.
  Considered a named group and `implicit_assignment` (Federation Broker Mode,
  org-wide semantics change).
- Authentik credential custody — **UI for client id/secret**; blueprint owns
  non-secret source attrs only. Considered `!Env` from `authentik-secrets`
  via `global.env` (net-new pattern; no other blueprint uses it). Credentials
  stay out of Git and out of Flux-reconciled attrs so reconcile cannot blank
  them.
- Ship style — **sequential MRs** — (1) Okta TF app, (2) source blueprint +
  UI credentials, (3) login-button binding. Each is independently
  observable and independently revertable.

## Steps

### Phase 0 — Preconditions

- [x] Confirm `OKTA_API_TOKEN` exists as a GitLab CI variable. It is **not**
      synced by `scripts/terraform/sync-gitlab-ci-variables.sh` and **not**
      asserted by `.tofu-preflight`. CI runs `terragrunt run --all`, so a
      missing token fails the whole `terraform/**` pipeline once the Okta
      module has real resources, not just the Okta stack.
      **2026-07-25:** operator confirmed present in GitLab CI.
- [x] Confirm the SSWS token still works locally:
      `cd terraform/deployments/okta/org && terragrunt plan`. SSWS tokens die
      after 30 days idle.
      **2026-07-25:** `terragrunt plan` → No changes; `/api/v1/users/me` 200.
- [x] Confirm the Okta admin identity behind the token holds Application
      Administrator + Group Administrator (or Super Administrator).
      **2026-07-25:** token identity has `SUPER_ADMIN`; apps list + Everyone
      `BUILT_IN` group readable.
- [x] Confirm `okta.apocrathia.com` is **active/verified** in Okta, not just
      CNAMEd in Cloudflare — `CUSTOM_URL` is rejected otherwise.
      **2026-07-25:** domain `validationStatus=COMPLETED`; discovery issuer +
      authorize/token/userinfo/jwks all on `okta.apocrathia.com` (not classic
      org host).
- [x] Capture the current `default-authentication-identification` stage before
      touching it (operator-led: `ak export_blueprint` in an authentik worker,
      or `GET /api/v3/stages/identification/`). **This is the rollback
      artifact for Phase 4.** Save under `.scratch/`.
      **2026-07-25:**
      `.scratch/default-authentication-identification.json` — `sources: []`
      today (local password path is via `user_fields`, not the sources M2M).
      Phase 4 still binds inbuilt + Okta explicitly.
- [x] Confirm Authentik break-glass: a local admin password that works, plus a
      recovery key (`ak create_recovery_key` in the server container) held
      outside the cluster.
      **2026-07-25:** operator local Authentik account is the break-glass.
- [x] Verify how chart `2026.5.6` accepts extra env for **both** server and
      worker (`global.env` vs `server.env`/`worker.env`) —
      `helm show values authentik/authentik --version 2026.5.6`.
      **2026-07-25:** `global.env` works, but unused — credentials go in the
      Authentik UI instead of `!Env`.

### Phase 1 — Okta OIDC app (OpenTofu)

Module `terraform/modules/okta-org` is currently an empty scaffold: this phase
creates `variables.tf` / `outputs.tf` alongside the first real resources.

- [x] Add `okta_app_oauth` as a web app: `type = "web"`,
      `grant_types = ["authorization_code"]`, `response_types = ["code"]`,
      `token_endpoint_auth_method = "client_secret_basic"`
- [x] Set `redirect_uris` to
      `https://auth.gateway.services.apocrathia.com/source/oauth/callback/okta/`
- [x] Set `login_mode = "SPEC"` and `login_uri` to
      `https://auth.gateway.services.apocrathia.com/source/oauth/login/okta/`;
      leave `hide_web = false` so the tile renders
- [x] Set `issuer_mode = "CUSTOM_URL"` and `omit_secret = true`
- [x] Omit `consent_method` — it is an EA property gated on API Access
      Management flags and can 403 on an integrator org
- [x] Add `data.okta_group` (`name = "Everyone"`, `type = "BUILT_IN"`) and one
      `okta_app_group_assignment`. Do **not** also use the plural
      `okta_app_group_assignments` on the same app — mixing them causes
      perpetual drift.
- [x] Add variables for label / redirect + login URIs; output `client_id`
      (non-secret) only
      **2026-07-25:** `oauth_apps` map (`for_each`) — Authentik is one
      deployment entry, not hardcoded module resources. Outputs are
      `oauth_client_ids` / `oauth_app_ids` keyed by map key.
- [x] Wire inputs in `terraform/deployments/okta/org/terragrunt.hcl` (today
      `inputs = {}`)
      **2026-07-25:** local `terragrunt validate` OK; `terragrunt plan` →
      2 to add (`okta_app_oauth.this["authentik"]`,
      `okta_app_group_assignment.everyone["authentik"]`). Not applied.
- [ ] MR → `tofu-validate` / `tofu-plan` green → merge. **Merging applies:**
      `tofu-apply` runs automatically on `main` for `terraform/**` changes.
- [ ] Read the client secret once from Okta Admin UI → Applications → the app →
      General → Client Credentials

**Validation checkpoint:** the app exists in Okta, the tile is visible, and
`https://okta.apocrathia.com/.well-known/openid-configuration` resolves and
lists `authorization_endpoint` / `token_endpoint` / `userinfo_endpoint` on the
custom domain. Stop here if the discovery document still shows the classic org
host.

### Phase 2 — Credentials (Authentik UI)

- [ ] After Okta TF apply: read client id + secret from Okta Admin UI →
      Applications → Authentik → General → Client Credentials
- [ ] In Authentik Admin → Directory → Federation and Social login → Okta
      source: set Consumer key / Consumer secret (create the source in the UI
      first if the blueprint create failed without those required fields, using
      slug `okta` so the blueprint can adopt it)
- [ ] Confirm credentials are set and the source is enabled

**Validation checkpoint:** source exists with credentials before Phase 4.
Smoke the hop at
`https://auth.gateway.services.apocrathia.com/source/oauth/login/okta/`.

### Phase 3 — Okta OAuth Source blueprint

- [x] Add `flux/manifests/03-services/authentik/blueprints/okta.yaml` following
      the existing header convention (schema comment, `version: 1`,
      `blueprints.goauthentik.io/instantiate: "true"`)
- [x] Model `authentik_sources_oauth.oauthsource`, `state: present`,
      `identifiers.slug: okta`, `id: okta-source` (the `id` is needed for
      `!KeyOf` in Phase 4)
- [x] Attrs: `name`, `provider_type: okta`, authorize / token / userinfo /
      JWKS URLs plus `oidc_well_known_url` on `okta.apocrathia.com`,
      `enabled: true`, `user_matching_mode: email_link`, and
      `authentication_flow` / `enrollment_flow` via `!Find` on the
      `default-source-*` flows. **Omit `consumer_key` / `consumer_secret`**
      so UI-entered credentials survive reconcile.
- [x] Register the ConfigMap in `blueprints/kustomization.yaml`
      `configMapGenerator` (the kustomize `labels` block already stamps
      `authentik_blueprint: "true"`)
- [ ] Operator apply / Flux reconcile
- [ ] Confirm the source applied cleanly in worker logs and appears in
      Authentik admin → Directory → Federation and Social login

### Phase 4 — Login button (identification stage)

The riskiest unit. Authentik's `sources` value is a many-to-many list and
appears to **replace** rather than merge, so omitting the inbuilt source drops
local login affordances.

- [ ] Add an entry for `authentik_stages_identification.identificationstage`,
      `state: present`, `identifiers.name: default-authentication-identification`
- [ ] `attrs` contains **only** `sources` — listing both the inbuilt source
      (`!Find [authentik_core.source, [managed, goauthentik.io/sources/inbuilt]]`)
      and `!KeyOf okta-source`. Every other stage attr stays absent so the
      built-in defaults survive.
- [ ] Keep a second browser session authenticated as a local admin while this
      applies
- [ ] Operator apply / Flux reconcile
- [ ] Confirm the login page shows both the local password path and the Okta
      button

### Phase 5 — Smoke and harden

- [ ] From Okta: open the Authentik tile → land authenticated in Authentik
- [ ] From Authentik login: "Okta" → complete OIDC → Authentik session
- [ ] Confirm local Authentik password login still works (fresh incognito
      session, no Okta involvement)
- [ ] Confirm an existing lab app (e.g. Proxmox OIDC) still authenticates via
      Authentik without talking to Okta
- [ ] Update `terraform/README.md` and the Authentik README with federation
      pointers (current state only)
- [ ] Delete this plan with the shipping change

## Feedback loop

- `cd terraform/deployments/okta/org && terragrunt validate && terragrunt plan`
- GitLab `tofu-validate` / `tofu-plan` on the TF MR; `tofu-apply` fires
  automatically on `main`
- `kustomize build flux/manifests/03-services/authentik`
- `helm template` the chart against the modified values to catch env schema
  mistakes before apply
- `yamllint` + `prettier --check` on changed YAML and markdown
- Trivy / secrets scan on changed paths before ship
- `kubectl get configmaps -n authentik -l authentik_blueprint=true` (read-only)
- Authentik **worker** logs for blueprint apply errors (read-only) — the worker,
  not the server, applies file-based blueprints
- `ak export_blueprint` in a worker to diff applied state against intent
  (operator-led exec)
- Manual SSO smoke (Phase 5)

## Notes

### Risks and rollback

| Risk                                                                     | Rollback                                                                                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Identification-stage patch drops local login icons                       | Re-apply the Phase 0 captured `sources` list; local password login itself is unaffected by the stage's source list |
| Okta custom domain disabled → `issuer_mode` silently resets to `ORG_URL` | Update the source's URLs to the classic org host, or re-activate the domain and re-apply                           |
| `!Env` / blank credentials on source                                     | N/A — credentials are UI-only; omit from blueprint attrs                                                           |
| Okta app misconfigured                                                   | `status = "INACTIVE"` on `okta_app_oauth`, or remove the resource                                                  |
| Merging the TF MR applies immediately                                    | Revert MR; note the app is already created by then, so a follow-up apply is what actually removes it               |

Never flip `omit_secret` from `true` to `false` — that force-recreates the app
and invalidates the credentials Authentik holds.

### Execution-time open questions

- Does `oidc_well_known_url` alone populate the authorize / token / profile
  URLs, or must all be set explicitly? Resolve by creating the source in the
  UI once and running `ak export_blueprint` to see what Authentik persists.
- Is the `sources` M2M genuinely replace-not-merge? Same method: export the
  stage before and after. Baseline captured: `sources: []` today.
- ~~Which chart values key injects env into both server and worker on
  `2026.5.6`.~~ → **`global.env`** (see Phase 0).

### References

- Authentik [Log in with Okta](https://docs.goauthentik.io/users-sources/sources/social-logins/okta/)
- Authentik [blueprint YAML tags](https://docs.goauthentik.io/customize/blueprints/v1/tags/)
  (`!Env`, `!Find`, `!KeyOf`) and
  [structure / state semantics](https://docs.goauthentik.io/customize/blueprints/v1/structure/)
- Okta provider [`okta_app_oauth`](https://registry.terraform.io/providers/okta/okta/latest/docs/resources/app_oauth)
  (pinned to `6.13.0` in `deployments/okta/org/.terraform.lock.hcl`)
- Okta [custom URL domain](https://developer.okta.com/docs/guides/custom-url-domain/main/)
  — the `issuer_mode` reset behavior
- Okta DNS lives in `terraform/deployments/cloudflare/dns` (CNAME `okta` →
  `integrator-5477892.customdomains.okta.com`, plus CAA and ACME TXT)
- Okta's servers never fetch `redirect_uris` or `login_uri`; those redirects
  happen in the operator's browser, so the RFC1918 gateway host
  (`10.100.1.99`) is fine for Authentik-as-RP
- Existing blueprint style reference: `blueprints/proxmox.yaml` (provider +
  application) and `kube-auth/authentik-blueprint.yaml` (groups + scope
  mappings). Neither models a Source — Phases 3 and 4 are greenfield here.

### Follow-ups worth filing

- `docs/issues/` for "expose Authentik publicly / Cloudflare Tunnel" if
  Okta-as-SP is ever wanted
- `docs/issues/` for "Okta authenticator methods in TF" — blocked on vendor
- `scripts/terraform/sync-gitlab-ci-variables.sh` does not sync
  `OKTA_API_TOKEN` even though `terraform/README.md` lists it; `.gitlab/README.md`
  still describes `tofu-apply` as manual. Both are pre-existing gaps outside
  this plan's scope.
