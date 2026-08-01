---
title: "Migrate Flux to Operator + GitLab MR ResourceSet pilot"
status: active
found_at: 2026-07-26
updated_at: 2026-07-30
related_issue: docs/issues/flux-operator-migration.md
area: flux
---

# Migrate Flux to Operator + GitLab MR ResourceSet pilot

## Goal

Replace vendored `gotk-components.yaml` with Flux Operator + a Ready
`FluxInstance`, then prove GitLab MR ResourceSets on a label-gated hypermind
side-by-side preview so Renovate (and other) version bumps can be smoked on
cluster before merge.

Upstream pattern:
[Ephemeral environments for GitLab MRs](https://fluxoperator.dev/docs/resourcesets/gitlab-merge-requests/).

## Scope

**In scope:**

- Phase A — strict handoff from gotk bootstrap to Flux Operator /
  `FluxInstance` (issue acceptance)
- Phase B — after Ready instance: hypermind-only MR preview via
  `ResourceSetInputProvider` + `ResourceSet`, label `deploy/flux-preview`
- Bootstrap docs for break-glass install + GitOps steady state
- Revisit gotk Trivy deferral once the vendor file is gone

**Out of scope:**

- Multi-app preview platform or Renovate auto-select
- Shadowing live object names/namespaces from MR tips
- OCI sync, Terraform bootstrap module
- Preview Gateway / DNS polish beyond whatever hypermind needs to come Ready
- Cluster mutate or git commit without operator authorization

## Decisions

- Plan packaging — **one plan, two serial phases** — ResourceSets are the why;
  cutover still finishes before preview CRs. Splitting files rejected.
- Sequencing — **strict serial (A then B)** — no dual ownership of controller
  Deployments; no ResourceSet pilot until `FluxInstance` is Ready.
- Operator bootstrap — **GitOps `HelmRelease` + OCI `HelmRepository` under
  `flux-system/`** (after classic gotk bootstrap). Not Kustomize `helmCharts`
  (kustomize-controller lacks `--enable-helm`). No live `FluxInstance` until
  gotk is out of desired state.
- Cutover mechanism — **kustomization resource toggles** — keep manifests in
  tree; comment/uncomment lines in `flux-system/kustomization.yaml` (gotk out,
  `flux-instance.yaml` in). `FluxInstance` manifest is present but commented
  out until cutover.
- Root KS safety — **`prune: false` + `deletionPolicy: Orphan` before emptying
  gotk** — prior KS loss with prune-on cascaded into restore hell. Soften the
  live gotk-sync KS first; `FluxInstance` ships the same on its generated KS
  via `spec.kustomize.patches`.
- Status UI auth — **Authentik double login** (proxy + native OIDC) with
  `flux-admins` only; OIDC + Git SSH both live in `flux-operator-secrets`.
- Preview shape — **side-by-side canary only** — not live object identity.
- Canary — **hypermind** — `generic-app` HelmRelease, no DB, low blast radius.
- MR trigger — **manual label `deploy/flux-preview` only** — opt-in; predictable
  teardown.
- Preview namespace — **`hypermind-preview`** — namespaced SA; admin RoleBinding
  in that ns only.
- Secrets —
  - **Git sync + Status UI OIDC** — 1Password item `flux-operator-secrets`
    → Secret of the same name. Fields: `oidc-client-id`, `oidc-client-secret`,
    `identity`, `known_hosts` (Flux SSH key name is underscore
    `known_hosts`, not kebab `known-hosts`).
    `FluxInstance.spec.sync.pullSecret: flux-operator-secrets`.
    Do **not** rely on the bootstrap-created `flux-system` Secret after
    cutover.
  - **Phase B GitLab PAT** — separate 1Password Item into
    `hypermind-preview` at implement time (API token for MR polling, not
    the deploy key).
- Protected path — **`flux/manifests/01-bootstrap/**` needs explicit confirm\*\*
  at implement time.

## Steps

### Phase A — Operator cutover

- [x] Ship operator-only GitOps (`HelmRepository` + `HelmRelease` under
      `flux-system/`). Leave gotk alone; no live `FluxInstance` yet. Confirm HR
      and operator Deployment Ready.
- [x] Status UI double-login SSO (Authentik proxy + OIDC) + `flux-admins` RBAC + `flux-operator-secrets` OIDC fields.
- [x] Stage `flux-instance.yaml` in-tree; keep commented out in
      `kustomization.yaml` until gotk is dropped. `pullSecret` →
      `flux-operator-secrets` (SSH via 1Password).
- [ ] Populate `identity` + `known_hosts` on the 1Password item
      `flux-operator-secrets` (deploy key; confirm Secret sync) before enabling
      the instance.
- [ ] Soften root `flux-system` Kustomization: `prune: false` and
      `deletionPolicy: Orphan` in `gotk-sync.yaml` (live object). Reconcile /
      confirm before commenting out gotk.
- [ ] Comment out `gotk-components.yaml` in `kustomization.yaml`. Controllers
      remain in-cluster until adopted. **Do not** uncomment `flux-instance.yaml`
      while gotk-components is still listed.
- [ ] Uncomment `flux-instance.yaml`. Operator adopts controllers via SSA;
      sync mirrors gotk-sync (GitLab SSH, `main`, path
      `./flux/manifests/01-bootstrap`, pullSecret `flux-operator-secrets`).
- [ ] Comment out `gotk-sync.yaml`; sync owned by the instance.
- [ ] Update bootstrap READMEs for steady state after cutover.
- [ ] Revisit `docs/issues/trivy-scan-noise-deferred.md` gotk CRITICAL bucket
      once the vendor file is unreferenced / gone.

**Phase A gate (must pass before Phase B):** Flux MCP `get_flux_instance`
Ready / Installed; `flux check` OK; controllers Ready; no gotk reference in
bootstrap build.

### Phase B — Hypermind MR ResourceSet pilot

- [ ] Create `hypermind-preview` Namespace + SA + namespaced RoleBinding.
- [ ] Wire GitLab PAT via 1Password Item into that namespace (Item name chosen
      at implement time; document vault path in README only).
- [ ] Add `ResourceSetInputProvider` (`GitLabMergeRequest`) filtering label
      `deploy/flux-preview` for `gitlab.com/Apocrathia/homelab` (confirm exact
      project URL at implement time).
- [ ] Add `ResourceSet` templating per-MR `GitRepository` @ `<< inputs.sha >>` + side-by-side hypermind `HelmRelease` (name suffix `<< inputs.id >>`)
      from MR tip — **not** the live `hypermind/hypermind` release. Validate
      with `flux-operator build resourceset` + mock inputs.
- [ ] Optional: GitLab webhook `Receiver` on the InputProvider; optional
      `gitlabmergerequestcomment` / commit-status Alert + Provider.
- [ ] Dry-run: open/label an MR that bumps hypermind image or chart pin →
      preview HR Ready; unlabel/merge → objects gone; live hypermind unchanged.
- [ ] Document label usage + teardown in hypermind or bootstrap-adjacent README.

## Feedback loop

Phase A:

- Flux MCP: `get_flux_instance` — present, distribution Installed, sync ready
- `flux check` / pods in `flux-system` Ready
- `kubectl get gitrepository,kustomization -n flux-system flux-system`
- `kustomize build` on bootstrap path — no `gotk-components` reference
- Trivy on `flux/manifests/01-bootstrap/flux-system/`

Phase B:

- `flux-operator build resourceset -f … --inputs-from …` succeeds
- Labeled MR → Ready preview HelmRelease in `hypermind-preview`
- Unlabel / merge → preview objects deleted
- Live `HelmRelease/hypermind` in `hypermind` unchanged
- MR comment or commit status reflects deploy success/fail (if enabled)

## Notes

- Issue SoT for Phase A acceptance:
  `docs/issues/flux-operator-migration.md`. Phase B is this plan’s extension
  of the migration motive; promote acceptance onto the issue when Phase B
  ships or file a follow-on issue if scope splits later.
- Cluster evidence (2026-07-26): root `flux-system` / `manifests` KS created
  `2025-11-15` with `prune: true`; newer child KS timestamps match prior
  recreate pain after KS loss.
- Implementer: confirm protected-path edits before touching
  `flux/manifests/01-bootstrap/**`. Planning is not authorize-to-mutate.
- Execution-time opens: whether webhook + MR-comment providers ship in the
  first B lap or immediately after the first successful labeled deploy.
- Reference:
  https://fluxoperator.dev/docs/resourcesets/gitlab-merge-requests/
