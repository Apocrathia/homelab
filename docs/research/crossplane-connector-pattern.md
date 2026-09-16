---
title: "Crossplane as the cross-system connector"
kind: assessment
status: complete
found_at: 2026-09-15
area: other
---

# Crossplane as the cross-system connector

> Research note (September 2026). Can Crossplane be the GitOps connector for
> config that lives in external systems but changes with the cluster?
> Authentik is the test case: native Crossplane providers vs
> Terraform-run-by-Crossplane vs Flux tofu-controller vs the current blueprint
> sidecar pattern. Follow-ups are proposals until they land as issues/plans or
> in the tree.

## Sources

| Source                                | URL / path                                                                                         | Role                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Crossplane core install               | `flux/manifests/03-services/crossplane/` (origin/main)                                             | deployed baseline: core 2.4.1, no providers |
| Authentik blueprint delivery          | `flux/manifests/03-services/authentik/helmrelease.yaml`                                            | current pattern under evaluation            |
| Blueprint census                      | 22 per-app + 12 service blueprints + 3 chart templates + 1 cleanup                                 | pattern breadth                             |
| Tofu CI stack                         | `.gitlab/tofu.gitlab-ci.yml`, `terraform/`                                                         | current Terraform operating model           |
| Tofu secrets plan                     | `docs/plans/tofu-1password-provider.md`                                                            | credential pattern to reuse                 |
| crossplane-contrib/provider-terraform | github.com/crossplane-contrib/provider-terraform (v1.2.0, 2026-08-24)                              | pattern-B lineage, TF 1.5.7 freeze          |
| upbound/provider-opentofu             | github.com/upbound/provider-opentofu (v1.1.8, 2026-09-11)                                          | recommended engine                          |
| flux-iac/tofu-controller              | github.com/flux-iac/tofu-controller (v0.16.5, 2026-08-06)                                          | pattern C                                   |
| goauthentik TF provider               | github.com/goauthentik/terraform-provider-authentik (v2026.8.0)                                    | coverage engine, 103 resources              |
| Authentik 2026.8.2 source             | `authentik/blueprints/v1/{tasks,importer}.py`, `authentik/blueprints/apps.py` @ `version/2026.8.2` | blueprint lifecycle ground truth            |
| Authentik blueprint docs              | docs.goauthentik.io — Blueprints (read 2026-09-15)                                                 | doc-vs-source discrepancy                   |
| Crossplane v2 docs                    | docs.crossplane.io — v2 provider model, finalizers, deletionPolicy                                 | lifecycle semantics                         |

## Question surveyed

Can the lab get true declarative lifecycle (create / update / delete / drift
repair) for per-app config in external systems, driven by the same Flux
reconcile loop that deploys the apps — replacing the one-shot Authentik
blueprint import?

### The problem, precisely

Today every app that needs an Authentik entry ships a blueprint ConfigMap:

1. App kustomization renders `authentik-blueprint.yaml` into a ConfigMap
   labeled `authentik_blueprint: "true"` — 22 per-app blueprints across the
   tree, plus 12 service-level blueprints (gitlab, okta, proxmox, … under
   `flux/manifests/03-services/authentik/blueprints/`, same ConfigMap +
   label pattern), 3 generic-app chart templates that render per-consumer
   blueprints, and 1 cleanup companion.
2. A `k8s-sidecar` in every Authentik server and worker pod watches all
   namespaces and copies those ConfigMaps into `/blueprints/user`.
3. Authentik's blueprint **discovery** imports the files. Import is an
   idempotent **apply**: `state: present` upserts by identifiers.

Gaps in that model, verified against Authentik 2026.8.2 behavior:

- **Delete propagation** — removing the ConfigMap removes the file, not the
  Authentik objects. Deletion needs a second blueprint with `state: absent`
  (see
  `flux/manifests/04-apps/productivity/cryptpad/authentik-blueprint-cleanup.yaml`),
  kept forever.
- **Drift repair** — applies are file-event driven, not periodic. Verified in
  the 2026.8.2 source (`authentik/blueprints/v1/tasks.py`,
  `authentik/blueprints/apps.py`): the hourly `blueprints_discovery` task and
  file-create events run through `check_blueprint_v1_file`, which applies only
  when the file's sha512 differs from `last_applied_hash`. File **modify**
  events, however, send `apply_blueprint` directly — ungated by hash. So the
  docs' "applied regularly (every 60 minutes)" describes discovery cadence,
  and manual UI edits to attrs-covered fields are repaired only when something
  rewrites the blueprint file. Nothing reconciles live objects on a timer:
  untouched files never re-apply, and a worker restart does not re-apply
  either (startup dispatches hash-gated discovery). That is event-triggered
  repair, not drift detection.
- **Visibility** — no per-object status reaches Flux. Failed imports set the
  blueprint instance's status to `error` (visible in the Authentik admin
  UI) and log to the worker, but Flux keeps showing the ConfigMap as healthy
  even when the import failed.
- **Atomicity (not actually a problem)** — applies _are_ transactional:
  `Importer.apply()` wraps the whole import in a Django `atomic()` block and
  rolls back on failure (`importer.py`, 2026.8.2). A failed import leaves no
  partial objects.
- **No orphan cleanup** — the apply loop only upserts `state: present`
  entries and deletes `state: absent` ones; objects whose entries were
  removed from a blueprint are never touched again (verified in
  `authentik/blueprints/v1/importer.py`, 2026.8.2 — there is no
  previously-managed-models cleanup).
- **Cache staleness** — the 24h per-user app-access cache is not purged by
  group/binding changes, so membership edits appear to lag or "not apply" for
  up to a day regardless of which config mechanism drives them.

### Why not just more Terraform in CI

The repo already runs OpenTofu + Terragrunt in GitLab CI for external infra
(Proxmox, Talos, Cloudflare, GitLab, Okta, Tailscale). That pipeline is
merge-event-triggered on `terraform/**/*`: batch runs in in-cluster runners
only when an MR touches the HCL, never on a schedule. It manages **static**
inventory — resources that exist independent of any cluster workload.

Per-app Authentik config is different. The desired state lives next to each
app's Flux manifests, changes whenever an app is added or removed, and should
reconcile continuously. Someone editing an HCL file should not be the only
thing that triggers it. The actual question is where the reconcile loop
lives: CI (batch, on merge) vs an in-cluster controller (continuous,
per-resource status).

## What already aligns

- Crossplane core 2.4.1 is already deployed
  (`flux/manifests/03-services/crossplane/`), core only, zero providers. The
  first managed resource is one Provider manifest away. Namespaced MRs are
  the v2 default.
- Crossview already renders providers, MRs, and compositions, so the
  observability half of "config as cluster objects" exists.
- The crossplane README already carries the provider-adding runbook: Provider
  CR → ProviderConfig with 1Password-backed secret → `defaultActivations`
  scoping against upjet CRD bloat.
- The credential pattern is proven. Tofu already resolves provider creds via
  1Password Connect (`docs/plans/tofu-1password-provider.md`); the Crossplane
  equivalent is a `OnePasswordItem` → Secret → ProviderConfig chain.
- The Authentik API is Terraform-shaped: the goauthentik provider covers
  Application, Provider, Group, User, bindings, flows, outposts. Whatever
  pattern wins, that surface is the coverage target.

## Key findings

### Pattern candidates

Four candidate patterns for per-app Authentik config. The same comparison
would apply to any external system with an API.

| #   | Pattern                                    | Reconcile loop             | Authentik coverage today           |
| --- | ------------------------------------------ | -------------------------- | ---------------------------------- |
| A   | Native Crossplane provider                 | Crossplane MR controller   | none maintained (hobby forks only) |
| B   | Terraform module via Crossplane Workspace  | Crossplane + tofu runtime  | full (goauthentik TF provider)     |
| C   | Flux tofu-controller                       | tofu-controller CRs        | full (goauthentik TF provider)     |
| D   | Status quo: blueprint ConfigMaps + sidecar | Authentik blueprint import | full (blueprint schema)            |

### A — Native Crossplane provider: not viable for Authentik

- `crossplane-contrib/provider-authentik` does not exist (404); there is no
  official or contrib-maintained Crossplane provider for Authentik.
- GitHub search surfaces only hobby one-offs: `rmk2/provider-authentik`,
  `EqO/provider-authentik`, `dhm116/provider-upjet-authentik`,
  `hops-ops/provider-authentik` — 0–3 stars, no community, several generated
  but unreleased. None are adoption-grade for the lab's IdP.
- Generalizes badly: the same is true for several systems the lab runs
  (the crossplane README already warns cloudflare/okta community providers are
  archived or stale). Native providers only exist for ecosystems Upjet
  upstreams happened to generate.

### Coverage target: goauthentik Terraform provider

The maintained surface is `goauthentik/terraform-provider-authentik` — 141
stars, release v2026.8.0 (2026-09-09) tracking Authentik 2026.8, pushed within
the last week. It covers Application, OAuth2/LDAP/proxy/SAML providers, Group,
User, policy bindings, flows, and outposts. Any pattern that can run Terraform
gets full, current Authentik coverage. There is no native provider to
compete with it.

### B — Terraform via Crossplane Workspace: healthy, with a lineage caveat

- `upbound/provider-terraform` is archived **and deleted** (repo 404s); the
  project moved to `crossplane-contrib/provider-terraform` — active, v1.2.0
  (2026-08-24), Crossplane v2-compatible. It is **frozen at Terraform CLI
  1.5.7** (BSL ceiling, per its own README).
- The modern sibling is `upbound/provider-opentofu` (v1.1.8, 2026-09-11,
  near-monthly releases) — same Workspace pattern, built on OpenTofu, which
  this repo already runs (tofu 1.12.x in CI). This is the natural pick.
- Workspace mechanics today: no `Module` CR, no `moduleRef`, no `StoreConfig`.
  A `Workspace` CR carries `source: Inline` (HCL string) or `source: Remote`
  (git URL + pull policy), inputs via `vars`/`varmap`/`varFiles`/`env`
  (SecretKeyRef/ConfigMapKeyRef supported), and optional init/plan/apply/destroy
  args. v1.1.8 ships both cluster-scoped (`opentofu.upbound.io`) and
  namespaced (`opentofu.m.upbound.io`) Workspace CRDs — per-app locality in
  the app's own directory/namespace works.
- One critical gotcha: the provider does not persist Terraform state.
  Modules must declare their own backend. The canonical in-cluster option is
  the Terraform/OpenTofu `kubernetes` backend (state stored as a k8s Secret).
- CRD footprint is small: 7 CRDs total in the v1.1.8 package (Workspace,
  ProviderConfig, ProviderConfigUsage in both cluster- and namespaced scopes,
  plus namespaced ClusterProviderConfig) — unlike a native upjet provider.

### C — Flux tofu-controller: the Flux-native alternative

- `flux-iac/tofu-controller` is active: v0.16.5 (2026-08-06), Apache-2.0,
  commits through 2026-09-02. Successor of Weaveworks tf-controller; default
  runner ships OpenTofu 1.12.1.
- Model: namespaced `Terraform` CR wired to Flux source-controller
  (`sourceRef` + `spec.path`), plan/apply executed in isolated runner pods,
  state in a k8s Secret via the default Kubernetes backend. `approvePlan:
auto` or named-plan approval for PR-style review; `branchPlanner` (tech
  preview) auto-plans branches.
- Dangerous default for this use case: `destroyResourcesOnDeletion` is
  `false` by default, so deleting the CR orphans the external resources.
  That is the exact inverse of Crossplane's default. Drift detection is on
  by default and repaired each interval.
- Cost: one more controller in the Flux fleet. It competes with pattern B for
  the same job; running both for different systems is defensible but adds
  two IaC mental models to the lab.

### B vs C vs D — lifecycle semantics

| Concern                   | B. Crossplane Workspace          | C. tofu-controller             | D. Blueprint (today)            |
| ------------------------- | -------------------------------- | ------------------------------ | ------------------------------- |
| Create / update           | tofu init+apply per poll (10m)   | plan/apply per `interval`      | file events + gated discovery   |
| Delete external on CR del | **yes (default)** → tofu destroy | **no (default)** — opt-in flag | no — needs `state: absent` hack |
| Drift (manual UI edit)    | repaired by 10m plan/apply       | detected on, repaired on loop  | never detected                  |
| Status visible to Flux    | Workspace conditions             | Terraform CR conditions + plan | none (worker logs only)         |
| Per-app manifest locality | yes (namespaced `.m.` Workspace) | yes (namespaced CR, sourceRef) | yes (ConfigMap in app dir)      |
| Failure isolation         | per-Workspace                    | runner pod per reconcile       | import task, all-or-log         |
| State                     | own backend (k8s Secret ok)      | k8s Secret (default backend)   | none (Authentik DB is state)    |

Pattern A (native MR) is omitted — no maintained Authentik provider exists
(see above). For systems that _do_ have healthy upjet providers, A's row would
read: delete-on-delete default, 10m drift repair, MR conditions, namespaced
MRs in v2 — the best per-resource ergonomics of the four.

### State and secrets

- Crossplane v2 **removed external secret stores**. The only sanctioned
  credential path is a plain k8s Secret referenced by the ProviderConfig.
  For this lab: `OnePasswordItem` → Secret → `ProviderConfig.spec.credentials`
  — the existing pattern, no External Secrets Operator needed.
- provider-opentofu's ProviderConfig takes a **credentials array**:
  `{filename, source: Secret, secretRef}` entries materialized as files in
  the workspace, plus an injected HCL `configuration` block that wires them
  into providers. An Authentik API token lands as a file → referenced from
  `provider "authentik" {}`.
- Terraform state under pattern B: the `kubernetes` backend with
  `in_cluster_config = true` stores each Workspace's state as a k8s Secret.
  Keep this **separate from the CI stack's GitLab HTTP backend** — the
  existing `terraform/` deployments are CI-reconciled static infra; cluster
  Workspaces are Flux-reconciled app config. Two stacks, two states, never
  the same backend.
- Pattern C uses the same k8s-Secret state backend by default, plus
  `writeOutputsToSecret` for cross-object wiring.

### Operational cost

- A generated native provider-authentik would add **~103 CRDs** (one per TF
  resource) — the crossplane README already mandates `defaultActivations`
  scoping against exactly this. The Workspace pattern avoids it entirely:
  7 CRDs total.
- Memory: Upbound's published benchmark puts a _huge_ provider (AWS, 1,000
  MRs) at ~405 MiB average per provider pod; a homelab-scale Authentik
  workspace set would sit far below. No published numbers exist for
  provider-authentik at any scale (unverified — would need measuring). The
  Crossplane chart ships no default requests/limits; set them when the
  provider lands.
- Reconcile cadence: upjet/Workspace default poll is 10m per resource
  (`crossplane.io/poll-interval` annotation overrides). A per-app Workspace
  set means N tofu plans per 10m against the Authentik API — trivial at
  ~20 workspaces, but worth watching since each plan re-reads state and hits
  the API.
- No rate-limit/429/concurrency issues are filed against
  `goauthentik/terraform-provider-authentik`; the provider is mid-migration
  from terraform-plugin-sdk v1 to v2 (robustness caveat, not a known failure).

## Conclusion

`inconclusive → leaning B`. The survey answers everything that can be
answered from sources; the pattern choice needs one bounded live spike to
confirm.

- The idea is sound. Crossplane as the connector for cluster-adjacent
  external config is a real, supported pattern, and the lab is one Provider
  manifest away from it.
- The engine is Terraform either way. There is no maintained native
  Authentik provider, so the only real choice is which reconcile loop runs
  the tofu: Crossplane Workspaces (B) or tofu-controller (C).
- B fits this lab better. The Crossplane core is already deployed and
  dashboarded, delete-propagation defaults to safe (destroy), and the CRD
  footprint is small. C would add a second IaC controller to the Flux fleet
  and defaults to orphan-on-delete, which is the same silent-leaves problem
  blueprints have today.
- The blueprint pain is real, not operator exaggeration. Applies fire on
  file events (only the discovery path is hash-gated; the docs' "60-minute"
  claim is discovery cadence, not re-apply), nothing reconciles on a timer,
  there is no orphan cleanup, and no object ever surfaces status to Flux.

## Recommendations

1. Spike one app first (`file-issue` candidate): migrate a low-stakes
   Authentik app entry (e.g. `headlamp`) from blueprint ConfigMap to a
   namespaced provider-opentofu Workspace with the kubernetes state backend.
   Prove create/update/delete/drift-repair end to end, then decide.
2. Keep Workspaces per-app with a shared module (app + provider + binding).
   Per-app delete propagation and per-app status are the point; one
   mega-workspace turns one accidental CR deletion into a full Authentik wipe.
3. Add a new 1Password item holding a scoped Authentik API token (service
   account): OnePasswordItem → Secret → ProviderConfig credentials array.
4. Keep blueprints for bootstrap-critical config (Authentik's own internal
   defaults, the worker's own needs). Migrate app-facing entries
   (Application/Provider/bindings) progressively, and delete the
   `state: absent` cleanup hacks as each migrates.
5. Generalize deliberately: the same pattern covers any external system with
   a healthy TF provider (Cloudflare, Tailscale, GitLab) once the Authentik
   spike proves the loop. Keep systems whose TF providers are dead (okta
   community provider is stale) in CI tofu.

## What not to do

- Do not generate or adopt a native provider-authentik: 103 CRDs, no
  maintained upstream, and the operator becomes the maintainer.
- Do not use `upbound/provider-terraform` (deleted repo, TF CLI frozen at
  1.5.7 BSL). Use `upbound/provider-opentofu`.
- Do not point cluster Workspaces at the CI stack's GitLab HTTP state
  backend. Two reconcile loops writing one state file is the classic
  split-brain.
- Do not migrate the blueprint fleet in one MR. The importer has no orphan
  cleanup, so a botched migration leaves objects behind with no status
  signal. Migrate per-app with a verification step each time.
- Do not trust the "blueprints re-apply every 60 minutes" doc line when
  reasoning about drift. The 2026.8.2 source is file-event driven, with only
  the discovery path hash-gated (see above).
