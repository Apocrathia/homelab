---
title: "Authentik chart→tofu lane — retire the generic-app blueprint ConfigMaps"
status: draft
found_at: 2026-10-18
updated_at: 2026-10-18
area: helm
---

# Authentik chart→tofu lane (generic-app blueprint retirement)

## Goal

Flip every generic-app HelmRelease from the chart-rendered `authentik-blueprint-*`
ConfigMaps to a tofu-owned Authentik stack, rendered by the same chart from the
same values, behind one switch: `authentik.managedBy: terraform`. This is the
operator's standing directive (keep migrating blueprints to terraform). The
worker crashloop storm is blueprint/outpost machinery-driven, so this lane is
remediation, not preference.

The blueprint-era live objects stay live: each flip ADOPTS them via the
live-proven merge gate (recipe §8), no recreate, no blip, nobody re-logs in.

## Scope

**In scope:**

- The `managedBy: terraform` chart lane rewrite in `helm/generic-app` (protected
  path — operator-authorized).
- Per-app flip MRs (values-only) for 62 blueprint chart apps + 2 legacy-lane
  apps (komga, demo-app).
- The shared proxy-outpost tofu stack (new file pair in
  `flux/manifests/03-services/authentik/`).
- The gate runbook per flip (adapted recipe §8 for chart apps).
- Wave-completion cleanup: blueprint template deletion, module deletion, old
  outpost sweep.

**Out of scope:**

- The authentik worker consume-only-at-boot bug (upstream 2026.8.x — this lane
  removes fuel, does not fix the bug).
- The 22 existing non-chart file pairs (they're done; only their outpost
  resources consolidate in the final sweep).
- authentik's own tree blueprints (`flux/manifests/03-services/authentik/blueprints/`,
  `kube-auth/`) — they stay.
- SAML/SCIM oddballs (fleetdm) — file-pair tier B, already deferred.

## Current state (grounded 2026-10-18)

- Chart: `0.0.86`. Two authentik lanes in `templates/`:
  - blueprint: `authentik-{proxy,oidc,bookmark}-blueprint.yaml` render
    `authentik-blueprint-<app>` ConfigMaps (labeled `authentik_blueprint: true`,
    hash-gated importer tick ~4 min).
  - tofu: `authentik-tofu-workspace.yaml` — the **deprecated antipattern**
    (Remote module ref pinned at the chart's own git tag + composed varmap;
    operator decision 2026-10-11). Live consumers: komga (`0.0.85`), demo-app.
- Fleet census (mechanical, every 04-apps HelmRelease with an `authentik:` block):
  **64 enabled** = 62 blueprint (51 proxy: 20 explicit + 31 modeless→proxy
  default − demo-app + mumble-web; 11 oidc) + 2 legacy tofu. 11 more carry
  disabled blocks. (Census scans every yaml file under 04-apps — HelmReleases
  do not always live in `helmrelease.yaml`; mumble-web lives in
  `04-apps/social/mumble/web.yaml`.)
- Live (read-only kubectl): **62 `ak-outpost-*` deployments** in ns authentik,
  ~643 Mi summed RSS, ~10.4 Mi/pod, zero requests/limits. **81 blueprint CMs**
  cluster-wide (~13 are authentik-tree's own; ~62 chart-app ones).
- Storm (`.scratch/authentik-storm-loki-report.md`): worker boot floods
  "Provider changed" × 61 providers → 61 `outpost_send_update` per boot; server
  steady-enqueues `outpost_send_update` in batches of ~60 every 30–40 min
  (outpost API session refresh — **O(outposts)**); workers consumed nothing for
  days pre-storm, backlog ~37k OOMs every fresh worker.
- Merged references (the shape sources): file pairs at
  `03-services/{headlamp,chaos-mesh,gatus}`, `04-apps/.../{jetkvm,immich,misp,opencti}`
  — gatus = adopted proxy (for_each-gated imports), immich = adopted oidc +
  `oidc-client-id` file lane, jetkvm = tile + the blink lesson (plain
  variable-id imports are BANNED; the jetkvm gate blinked — duplicate binding
  — the only safe generated-id import shape is
  `for_each = var.adoption ? toset(["g"]) : toset([])`).

## Decisions

Operator-fixed (live-proven, do not re-litigate):

1. **Pattern**: per-app tofu stack = `OnePasswordItem` (workspace token) +
   `ProviderConfig` (credentials + `backendFile`) + `Workspace` (`source:
Inline`, prune guard `managementPolicies: [Observe, Create, Update]`, **no
   varmap in git**). For chart apps the CHART renders this shape per app —
   per-app manifest files were explicitly rejected for chart apps
   ("implementing this in the chart, and flipping a switch").
2. **Banned**: chart-tag-pinned module refs (`git::...?ref=generic-app-<ver>`),
   varmap-composed values, Remote module pulls. Inline HCL only.
3. **Adoption**: application import ungated by slug; generated ids (provider
   pk, binding uuids, outpost uuid) on for_each-gated import blocks; two-way
   plan-time validation; gate = recipe §8 born-with-varmap
   (suspend tree → merge → apply patched render → confirm "N to import" →
   clear → resume). Ids never enter git.
4. **Fresh-create rules** (MISP lesson): `grant_types` explicit (default
   `[authorization_code, refresh_token]`, the current blueprint shape);
   `response_types` never written (not in the goauthentik 2026.8.0 TF schema);
   `token_validity` dead (omit).

Planner recommendations (ratify by merging):

| #   | Decision                      | Chosen                                                                                                                                                                                                                                           | Why / reversibility                                                                                                                                                                                                                                                               |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | The switch                    | keep `authentik.managedBy: blueprint\|terraform`                                                                                                                                                                                                 | exists since 0.0.84, operator-ratified, komga/demo-app already use it; zero new switch key. Reversible per app by flipping back.                                                                                                                                                  |
| D2  | Outposts                      | **shared** tofu-owned outposts (file pair in the authentik tree), proxy apps stop owning outposts                                                                                                                                                | cuts 62 pods→~4, session-refresh batches ~60→~2-3 per 30-40 min, −60 k8s object sets; per-app HCL drops the outpost resource + the outpost import id. Priced below. Reversible: the gatus per-app shape is the documented fallback (drop-in HCL section + `import_outpost_uuid`). |
| D3  | komga/demo-app retirement     | retire through the new chart lane: suspend helmrelease → orphan workspace CR → delete state Secret → §7 provider pod restart → normal gate re-adopt                                                                                              | keeps ONE mechanism for all chart apps (operator rejected per-app files); fresh inline workspaces never hit §7 again. Komga witness ids are recorded (recipe §4).                                                                                                                 |
| D4  | Blueprint template retirement | YES at wave completion — delete the 3 blueprint templates + module `terraform/modules/authentik-app` + blueprint-only values keys                                                                                                                | constraint 10; the chart keeps no blueprint knowledge. `managedBy` key stays as rollback insurance.                                                                                                                                                                               |
| D5  | Bookmark downgrades           | NOT bundled into the parity flips. The operator's 27-app "bookmark" list is live PROXY today (verified — see Risks §R7); tile-downgrade removes auth per app and needs an exposure decision. Listed + priced as a decision-gated follow-on wave. | avoids 27 silent auth-removals riding an infra lane.                                                                                                                                                                                                                              |

## Target design

### The switch — values contract

The tofu lane composes from the **same values surface the blueprint templates
read**. No values-side varmap, no module refs, no per-app terraform files. New
keys are additive, defaults match live rows.

```yaml
authentik:
  enabled: true
  managedBy: blueprint # blueprint | terraform  ← THE SWITCH
  mode:
    proxy # proxy | oidc | bookmark; missing = proxy (the
    #   chart default — the tofu template reads it the
    #   same way the blueprint templates do, so the
    #   modeless fleet flips as proxy parity)
  displayName: "…"
  externalHost: "https://<app>.gateway.services.apocrathia.com"
  ssoLaunchUrl: "" # tile launch URL override (existing key)
  icon: "…" # chart serves icons via cdn…gateway… URL (existing key)
  openInNewTab: true
  category: "Applications"
  metaDescription: "" # optional; empty = omitted (null parity)
  metaPublisher: "" # optional
  authorizationFlow: default-provider-authorization-implicit-consent
  invalidationFlow: default-invalidation-flow
  authenticationFlow: default-authentication-flow # proxy only
  shared:
    false # users binding + tailnet exposure (existing gate:
    #   shared:true requires tailnet.enabled:true)
  # proxy-mode compose (new/changed):
  internalHost: "" # "" = compose http://<app>.<ns>.svc.cluster.local:<port>
  interceptHeaderAuth:
    false # ALWAYS sent in HCL (TF default true must never
    #   silently PATCH a live row)
  skipPathRegex:
    [] # list → joined "\n", no trailing newline (grafana
    #   18-byte live-verbatim lesson); [] = omitted
  accessTokenValidity:
    "hours=1" # proxy provider attr; TF default minutes=10 would
    #   PATCH blueprint-era rows (live = authentik model
    #   default hours=1)
  # oidc-mode compose (new/changed):
  oidc:
    redirectUris: [{ url: …, matchingMode: strict }]
    scopes: [openid, email, profile]
    customScopeMappings: [] # name/scopeName/expression(/description)
    clientType: confidential
    subMode: user_username
    includeClaimsInIdToken: true
    issuerMode: per_provider
    signingKey: "authentik Self-signed Certificate"
    accessCodeValidity: "minutes=1"
    accessTokenValidity: "minutes=5"
    refreshTokenValidity: "days=30"
    grantTypes: [authorization_code, refresh_token] # live-verbatim override per app
    clientIdFromSecret: # the trimspace(file("oidc-client-id")) lane
      enabled: false # true ⇒ ProviderConfig credentials entry
      name: "" # "" = <app>-secrets (the chart OnePasswordItem name)
      key: oidc-client-id # house convention (komga/immich/cryptpad)
    # clientId: ""               # static literal lane for fresh creates (misp/
    #   opencti style); mutually exclusive with
    #   clientIdFromSecret.enabled — render fails if both/neither
```

Dead keys on the tofu path: `serviceConnection`, `replicas`, `namespace`,
`logLevel`, `gateway.*` (outpost shape — moves to the shared stack under D2);
`oidc.clientSecret` (Sensitive, generated — never in HCL); `oidc.tokenValidity`
(dead attr). The values.yaml comments for the tofu block get rewritten to say
exactly this.

`valuesFrom` note: komga/cryptpad `valuesFrom → authentik.oidc.clientId` entries
are REMOVED in the flip MR (flux merges them pre-render — the tofu lane must not
see the client_id value). The app's own env consumption via `secretKeyRef` is
untouched. The HCL reads the client_id from the `oidc-client-id` file the
ProviderConfig materializes from the same 1Password-backed Secret.

### Chart template architecture

Files (all under `helm/generic-app/`):

| File                                                       | Action                                            | Renders                                                                                                            |
| ---------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `templates/authentik-tofu-workspace.yaml`                  | **rewrite**                                       | `OnePasswordItem` + `ProviderConfig` + `Workspace` when `managedBy: terraform`, all three modes, inline HCL module |
| `templates/authentik-{proxy,oidc,bookmark}-blueprint.yaml` | unchanged now; **delete at wave completion** (D4) | blueprint CMs when `managedBy: blueprint`                                                                          |
| `values.yaml`                                              | values contract above                             | —                                                                                                                  |
| `README.md` §`managedBy`                                   | rewrite                                           | docs                                                                                                               |
| `CHANGELOG.md`                                             | entries                                           | 0.0.87 (new lane), completion bump                                                                                 |

The rewritten template renders, in order:

1. `OnePasswordItem` `authentik-terraform-token` — itemPath
   `vaults/Secrets/items/crossplane-terraform-secrets` (unchanged shape).
2. `ProviderConfig` `<app>-authentik` — credentials: `authentik-token` (Secret
   `authentik-terraform-token`, key `authentik-terraform-token`) plus
   `oidc-client-id` (Secret `<app>-secrets`, key `oidc-client-id`) when
   `clientIdFromSecret.enabled`; `backendFile`:
   `secret_suffix = "<ns>"`, `namespace = "<ns>"`, `in_cluster_config = true`
   (state Secret `tfstate-<app>-authentik-<ns>`, same names as today).
3. `Workspace` `<app>-authentik` — prune guard `managementPolicies:
[Observe, Create, Update]` (crossplane v2 orphan-on-delete; decommission
   needs a temporary `["*"]` window), `providerConfigRef` to 2, `forProvider:
{source: Inline, module: <generated HCL>}` — **no varmap key at all**.

Template-side render guards (`fail` loudly): `bookmark + oidc/proxy`
combinations invalid; `shared && !tailnet.enabled` (existing guard);
`oidc` with both/neither of `clientId`/`clientIdFromSecret.enabled`; unknown
mode.

### HCL shapes (the template generates these per app)

Chart-generated HCL must be shape-identical to the merged file-pair exemplars
(diff the rendered module against gatus/immich/jetkvm when implementing).
Skeletons — one per mode; every app's values fill the placeholders.

Common header (all modes — the gatus/immich verbatim shape):

```hcl
terraform {
  required_providers {
    authentik = { source = "goauthentik/authentik", version = "2026.8.0" }
  }
  # PARTIAL kubernetes backend; per-app args come from ProviderConfig.backendFile.
  # The empty block MUST stay — without it -backend-config falls back to the
  # LOCAL backend and the adoption bar dies (empty state ⇒ full duplicate set).
  backend "kubernetes" {}
}

provider "authentik" {
  url   = "https://auth.gateway.services.apocrathia.com"
  token = file("authentik-token")
}

data "authentik_group" "admins" { name = "admins", include_users = false }
# users lookup rendered when shared:true; the users data source also rendered
# unconditionally for non-shared apps (module-shape parity keeps the address
# set; unreferenced data sources are fine).
data "authentik_group" "users" { name = "users", include_users = false }
```

Adoption variables + two-way validation (all modes; the per-mode id set varies):

```hcl
variable "adoption" {
  type    = bool
  default = false
  # Gate 1: adoption=true with any id empty FAILS loudly.
  validation { condition = !var.adoption || ( <every id non-empty> ) , … }
  # Gate 2: ids set with adoption=false FAILS loudly.
  validation { condition = var.adoption || ( <every id empty> ), … }
}
# Per-shape generated id variables (defaults = empty):
#   tile:     import_binding_admins_pk, import_binding_users_pk (shared only)
#   proxy:    import_provider_pk (number), + binding ids
#   oidc:     import_provider_pk (number), + binding ids
#             import_custom_scope_mapping_ids (map(string), one key per declared
#             customScopeMappings entry)
```

Import blocks (generated per app):

```hcl
# Application: UNGATED by design — applications import BY SLUG, a static literal.
import { to = authentik_application.app, id = "<app-slug>" }

# Generated ids: for_each-gated, default off. PLAIN variable-id imports are
# BANNED (the jetkvm blink: tofu plans a CREATE when the id resolves empty).
import {
  for_each = var.adoption ? toset(["g"]) : toset([])
  to       = authentik_provider_proxy.app          # or _oauth2 / _policy_binding.admins
  id       = var.import_provider_pk != 0 ? tostring(var.import_provider_pk) : ""
}
# …one gated block per binding (admins always; users when shared), and per
# custom scope mapping (id = var.import_custom_scope_mapping_ids["<name>"]).
```

Mode resource bodies (after the common header):

- **tile/bookmark** (jetkvm shape): `authentik_application.app` (name, slug,
  group=category, meta*launch_url = ssoLaunchUrl|externalHost, open_in_new_tab,
  meta*\* only when set) + `authentik_policy_binding.admins` (target app.uuid,
  group admins.id, order 10) + `authentik_policy_binding.users` (order 20) when
  shared. No flows, no provider, no outpost.
- **proxy** (gatus minus the outpost): `data "authentik_flow"` ×3 (authz,
  invalidation, authentication) + `authentik_provider_proxy.app`
  (name `<app>-proxy-provider`, mode proxy, 3 flow ids, internal_host, external_host,
  intercept_header_auth always sent, skip_path_regex when set, access_token_validity
  always sent) + application (protocol_provider = provider id) + bindings. **No
  outpost resource, no service-connection lookup** (D2 — the shared stack owns outposts).
- **oidc** (immich shape): flows authz+invalidation (authentication ungated,
  parity), `data "authentik_certificate_key_pair".signing`, standard
  `data "authentik_property_mapping_provider_scope"` per scopes[] entry,
  `resource "authentik_property_mapping_provider_scope" "custom` per
  customScopeMappings (for_each over the names — address
  `custom["<name>"]`, expression/description verbatim),
  `authentik_provider_oauth2.app` (name `<app>-oidc-provider`, client_id =
  static literal OR `trimspace(file("oidc-client-id"))`, client_type, sub_mode,
  include_claims_in_id_token, issuer_mode, signing_key, property_mappings =
  standard lookups minus shadowed scopes + custom resources, allowed_redirect_uris,
  3 validity attrs always sent, grant_types always sent) + application
  (protocol_provider) + bindings.

### Shared outposts (D2) — the new tofu stack

New file pair in `flux/manifests/03-services/authentik/` (the authentik tree,
NOT a chart app): `crossplane.yaml` + `authentik.tf` + kustomization stitch
(same `configMapGenerator` + replacements house pattern as every other pair).

- Two outposts, each provider on **exactly one**:
  - `proxy-main`: parentRefs `main-gateway` only.
  - `proxy-tailnet`: parentRefs `main-gateway` + `tailnet-gateway` (shared apps).
- `kubernetes_replicas: 2` each (HA the current single-replica per-app outposts
  never had), `automountServiceAccountToken=false` json patch, the blueprint
  config keys verbatim.
- `protocol_providers` = data-source lookups by provider name (one
  `data "authentik_provider_proxy"` block + list entry per app), so each
  wave MR adds its apps' names alongside the helmrelease flips. A provider
  gains the shared-outpost m2m **before** its old outpost dies — both outposts
  serving the same provider is proven-harmless (duplicate routes both
  authenticate; the gateway picks one).
- The old per-app outposts: chart-flip apps NEVER adopt them (no
  `import_outpost_uuid`, no outpost resource) — they keep serving unmanaged
  until the sweep; the 22 file pairs' outposts ARE tofu-owned and die via a
  `managementPolicies: ["*"]` window (the documented decommission path).

**Price (live-grounded):**

|                              | per-app outposts (today)                       | shared (2×2 replicas)                                                                                                  |
| ---------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| pods at 61 proxy providers   | 62 (live: 643 Mi RSS, unrequested)             | 4 (~40 Mi)                                                                                                             |
| session-refresh task batches | ~60 per 30–40 min (O(outposts))                | ~2 per 30–40 min                                                                                                       |
| boot-flood sends             | 61 (O(providers) — the signal is per provider) | 61 at 61 providers (unchanged; O(providers) regardless)                                                                |
| API objects                  | 61 deployments + services + HTTPRoutes         | 2 sets                                                                                                                 |
| provider change              | per-app config pickup                          | config pickup by polling — **no pod rollout** (outposts poll config; deploys only change on parentRefs/replicas/image) |
| blast radius                 | one app per outpost pod                        | one shared pod serves many apps; replicas=2 covers it                                                                  |
| at ~122 providers (growth)   | 122 pods, ~120 batches                         | 4 pods, ~2 batches                                                                                                     |

Boot flood is O(providers) in every design; the only lever for it is fewer
providers (D5 downgrades) — the real, priced wins here are pods, steady task
load, and object count. Recommendation: **shared**, as above.

## The flip + gate runbook

Per app (recipe §8 adapted to chart apps; ids never in git):

1. **Witness pass (read-only psql, batched per wave):** per recipe §2 —
   provider pk, binding uuid(s) per app; for oidc also custom-mapping pm_uuids,
   grant_types, and the full live-attrs row (parity table). One psql batch per
   wave, sheet under `.scratch/`.
2. **Flip MR (values-only):** `managedBy: terraform` (+ per-app live-delta keys
   from the parity table; remove valuesFrom clientId entries; add
   `clientIdFromSecret.enabled: true` where applicable). Id-free.
3. **Suspend:** `flux suspend kustomization <app-tree>` (apps-media, apps-ai, …).
4. **Merge.**
5. **Render + patch + apply ONCE (born-with-varmap):**
   - Render: `helm template <app> ./helm/generic-app -n <ns>` with the merged
     helmrelease values (yq-extract `spec.values`); the render contains the 3
     tofu docs, module inline, NO varmap.
   - Patch the rendered Workspace: `spec.forProvider.varmap` = the reduced
     witness key set (adoption: true + the app's ids; the jetkvm-corrected
     discipline: only the keys the HCL declares — no
     import_application_id, no empty map keys).
   - Stamp helm ownership on all 3 docs (client-side apply then lets
     helm-controller's SSA take over cleanly; without the stamps the first
     post-resume `helm upgrade` fails on ownership metadata — live-grounded on
     komga's workspace labels/annotations):
     labels `app.kubernetes.io/managed-by: Helm`,
     `helm.toolkit.fluxcd.io/name: <app>`, `helm.toolkit.fluxcd.io/namespace:
<ns>`; annotations `meta.helm.sh/release-name: <app>`,
     `meta.helm.sh/release-namespace: <ns>`.
   - `kubectl apply` (client-side) the 3 docs. The Workspace is born WITH the
     adoption varmap — no race, first reconcile plans
     **"N to import, 0 to add, 0 to change, 0 to destroy"**.
6. **Confirm:** Workspace Synced/Ready; state Secret
   `tfstate-<app>-authentik-<ns>` appears with serial bump; witness uuids
   unchanged in the DB; zero create/delete churn in authentik events (tofu
   actions emit none — uuids are the witness).
7. **Clear the varmap** on the live object (merge-patch to adoption:false +
   empty ids, or JSON-patch-remove); confirm Synced holds (No changes).
8. **Resume:** `flux resume kustomization <app-tree>` — flux applies the
   id-free helmrelease; helm upgrade takes over the pre-stamped docs;
   blueprint CMs prune from the release (objects survive — proven).
9. **Verify steady state:** next reconcile No changes; the app's
   `authentik-blueprint-<app>` CM is gone; app login works.

Wave-0 special (komga, demo-app — the legacy-lane retirement, also the pilot):
`flux suspend helmrelease <app>` FIRST (the old release owns the workspace docs
and a periodic reconcile would fight the gate), then: `kubectl delete workspace
<app>-authentik` (prune guard ⇒ orphan, objects survive) + delete the state
Secret (`tfstate-komga-authentik-komga`, `tfstate-demo-app-authentik-demo-app`)
— the module-era state dies with the antipattern; then the §7 provider pod
restart (delete the single `upbound-provider-opentofu-*` pod in
crossplane-system; all workspaces re-init from clean workdirs, states
untouched); then the normal gate from step 5 with komga's recorded witness ids
(recipe §4) / demo-app's fresh capture. Resume helmrelease + tree. After this,
no Remote residue exists anywhere — §7 never applies again.

## Waves

Batch = 3-4 apps per MR, one tree per MR, per-app gates stay separate. Order:
oidc first (heaviest, most custom shape variance), proxy second (volume),
downgrades decision-gated, consolidation last.

| Wave                                   | Apps                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Notes                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **W0 pilots**                          | komga, demo-app                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | new-lane proof + legacy retirement + §7 restart (once). Chart bump 0.0.87 rides this MR.                                                                                                                                                                                                                                                                |
| **W1 oidc** (11)                       | aurral, calibre-web-automated (2 custom mappings), chaptarr (1), cryptpad (valuesFrom→file lane, shared), endurain, hermes-agent, jellyfin (shared, ssoLaunch), mealie (1, shared), meshtastic, projectsend (shared), romm (1, shared)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | witness pass covers grant_types live rows (blueprint sets 2-entry; older rows may differ — pin live-verbatim per app)                                                                                                                                                                                                                                   |
| **W2 proxy parity** (51)               | apps-ai (7): comfyui, duckdb, odysseus, openclaw, prime-agent, promptfoo, pyrit · apps-games (2): archisteamfarm, moonlight-web (iha) · apps-home (3): companion, terminus (skip), uptime-kuma · apps-management (13): bazarr, cantinarr (skip), cleanuparr, houndarr, huntarr2 (skip), lidarr (skip), radarr (skip), seerr (shared), sonarr (skip), speedtest (shared), suwayami, tdarr-server, whisparr · apps-media (12): archiveteam-warrior, copyparty (shared), halcyon (shared), invidious (shared), lidarr-youtube-downloader (skip), prowlarr, qbittorrent, restreamer, sabnzbd, slskd, soularr, tunarr (skip) · apps-productivity (8): changedetection-io, excalidraw, kiwix (shared, skip), n8n (iha), rclone, searxng (shared), silverbullet (skip), wakapi (skip, iha) · apps-security (1): prism · apps-social (5): hypermind, lemmy (shared), mumble-web, tak (shared, skip), thelounge | skip-path apps render regexes byte-verbatim; each wave MR also adds its proxy apps' provider names to the shared-outpost stack                                                                                                                                                                                                                          |
| **W3 downgrades (decision-gated, D5)** | the operator's 27: archisteamfarm, uptime-kuma, speedtest, prowlarr, qbittorrent, sabnzbd, slskd, soularr, lidarr, radarr, sonarr, seerr, tdarr(-server), whisparr, restreamer, tunarr, changedetection-io, excalidraw, kiwix, rclone, searxng, lemmy, archiveteam-warrior, lidarr-youtube-downloader, cleanuparr, huntarr2, invidious                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | each is live PROXY today; tile flip = `mode: bookmark` + gate deletes the live provider/outpost rows (2 API deletes in the window) + `httproute.enabled: true` decision per app (unauthenticated exposure posture — operator call per app)                                                                                                              |
| **W4 consolidation**                   | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | old-outpost sweep (API deletes for never-tofu outposts; mp=["*"] windows for the 22 file pairs), blueprint template + values keys + module deletion (D4), disabled-block values cleanup (home-agent-bridge, discord-bridge, firecrawl, amp-exporter, cdn, unpoller, icloudpd, recyclarr, jellyfin-ai-upscaler, opencanary, opentaxii), README/CHANGELOG |

## Acceptance Bar (per wave MR)

1. `helm template` per flipped app renders the 3 tofu docs; the blueprint CM is
   absent from the render; template output is valid YAML; yamllint passes.
2. The rendered `module` field, extracted to a file, passes
   `tofu init -backend=false && tofu validate` (goauthentik 2026.8.0) — catches
   HCL syntax + schema misuse (grant_types/response_types rules) pre-merge.
3. Parity table per app: rendered HCL values == live DB rows (psql capture);
   zero unexplained deltas. Deltas → values keys, never ids.
4. Import-block review (the jetkvm correction): every generated-id import is
   for_each-gated; the application import is the only ungated block; validation
   blocks fail-test both directions (two-way).
5. Gate evidence per app: first reconcile plan "N to import, 0 to add, 0 to
   change, 0 to destroy" (judged by Synced/Ready + state serial + witness
   uuids unchanged — provider-opentofu emits no tofu stdout); zero
   create/delete churn in authentik events; varmap cleared; post-resume
   reconcile No changes.
6. Steady state: `authentik-blueprint-<app>` CM gone from the app namespace;
   app login works end-to-end.
7. Security: no client_id/client_secret/token values in any manifest or MR
   diff (only Secret names/keys); Trivy + secret scan on changed paths clean.

## Risks + confirmations

- **R1 bootstrap ordering — CONFIRMED non-issue for 03/04 apps.** Crossplane,
  provider-opentofu (single deployment, crossplane-system) and 1Password
  Connect are ≤03 layer; app trees reconcile after. OnePasswordItem → Secret
  lags by seconds; ProviderConfig/Workspace reconcile retries self-heal. The
  22 merged file pairs at layers 02/03/04 prove it in-tree. Cold-cluster: same
  ordering (01→02→03→04), no chart-tag CI dependency anymore (inline HCL kills
  the create-chart-tag race the old lane had).
- **R2 helm ownership on the patched render.** Grounded: komga's live workspace
  carries the helm/flux labels + annotations. Pre-stamp them at gate step 5
  (client-side apply) so the post-resume `helm upgrade` (SSA) adopts cleanly.
  Fallback if it still errors: prune-guard makes the 3 docs
  delete-and-recreate-safe (objects + state Secret survive a CR delete) —
  delete, resume, let helm create, then race-free re-adopt via the normal gate.
- **R3 Remote→Inline residue (§7).** Only the two legacy workspaces carry it;
  the wave-0 pod restart clears it once. New workspaces are born Inline.
- **R4 prune-guard decommission semantics.** Plan-time destroys (resource
  removed from HCL) need a temporary `managementPolicies: ["*"]` window —
  used by the W4 sweep for the 22 file pairs' outposts; never needed for
  chart flips (their outposts are never adopted).
- **R5 worker storm fuel.** This lane removes ~62 chart-app blueprint CMs and
  their importer hash-gating/apply_blueprint/blueprints_discovery cycles, and
  (with D2) drops session-refresh batches ~60→~2-3 per 30-40 min. The
  O(providers) boot flood persists by construction until W3 downgrades
  (61→~34 proxy providers). The upstream consume-only-at-boot bug is out of
  scope — storm mitigation (restart workers / raise limits) stays with SRE.
- **R6 gate varmap discipline.** Inject ONLY the reduced key set the HCL
  declares; extra keys yield tofu warnings/errors (witnesses-doc correction).
  `skip_path_regex` joins byte-verbatim (grafana 18-byte lesson).
- **R7 the bookmark-list surprise.** All 27 "bookmark-mode" apps verified
  **proxy-live today** (modeless → chart default proxy; sabnzbd-outpost exists
  live). Their tofu flips are therefore PARITY proxy flips unless the operator
  ratifies the W3 downgrade per app. The chart's bookmark shape is required
  (constraint 7) and ships in 0.0.87 regardless — proven by render + tofu
  validate against the jetkvm exemplar.

## Files touched (implementation inventory)

Protected (helm/generic-app/\*\* — operator-authorized):

- `helm/generic-app/templates/authentik-tofu-workspace.yaml` — rewrite (core)
- `helm/generic-app/values.yaml` — authentik block (comments + new keys)
- `helm/generic-app/README.md` — §Authentik stack ownership: managedBy
- `helm/generic-app/CHANGELOG.md` — 0.0.87 + completion entries
- (W4) `helm/generic-app/templates/authentik-proxy-blueprint.yaml` — delete
- (W4) `helm/generic-app/templates/authentik-oidc-blueprint.yaml` — delete
- (W4) `helm/generic-app/templates/authentik-bookmark-blueprint.yaml` — delete
- (W4) `helm/generic-app/values.yaml` — drop blueprint-only keys

Outside the chart:

- `flux/manifests/03-services/authentik/` — new shared-outpost file pair
  (`crossplane.yaml`, `authentik.tf`, `kustomization.yaml` edit, README) + wave
  MRs appending provider names
- 62× `flux/manifests/04-apps/**` helmrelease-bearing yaml — values-only flips
- (W4) `terraform/modules/authentik-app/**` — delete (no consumers after W0)
- (W4) the 22 file pairs' `authentik.tf` — outpost-resource removal (sweep)
- `docs/plans/authentik-chart-tofu-lane.md` — this plan (living checkboxes)

## Feedback loop

- `helm template <app> ./helm/generic-app -f <app-values>` — docs render,
  blueprint CM absent in tofu mode, guards fail loudly on invalid combos
- extract module → `tofu init -backend=false && tofu validate`
- `yamllint` + prettier on manifests; Trivy + secret scan on changed paths
- `kubectl -n authentik exec authentik-postgres-1 -- psql -U postgres -d
authentik` (read-only witness/parity queries, recipe §2)
- Flux MCP read (Kustomization/HelmRelease/Workspace status) — read-only;
  gate mutations (suspend/apply/patch/resume) are operator-led
- Live witnesses: workspace Synced/Ready, state Secret serial, event churn
  in authentik ns, login smoke per app

## Open questions (operator)

1. **W3 posture per app**: ratify tile-downgrade for the 27 (auth removal +
   `httproute.enabled` exposure call per app), or leave them proxy parity
   (this plan's default)?
2. **Shared-outpost split**: two outposts (main / main+tailnet) as designed —
   single shared outpost would put every provider on the tailnet door
   (reachable-but-gated) — confirm the two-outpost split.
3. **komga/demo-app path**: retire through the new chart lane (D3) vs convert
   to file pairs — D3 recommended.
