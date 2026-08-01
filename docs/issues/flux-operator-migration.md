---
title: "Migrate Flux from vendored gotk to Flux Operator"
kind: architecture
status: open
severity: high
source: human
found_at: 2026-07-26
found_by: operator
area: flux
slice: hitl
plan: docs/plans/flux-operator-migration.md
---

# Migrate Flux from vendored gotk to Flux Operator

## Problem / desired state

Flux controllers are installed from a vendored bootstrap artifact
(`flux/manifests/01-bootstrap/flux-system/gotk-components.yaml`, ~10k lines)
plus hand-synced `gotk-sync.yaml`. There is no `FluxInstance` on the cluster
today. Controller version labels and the file header already disagree (vendor
drift), and Trivy CRITICAL RBAC findings on gotk are parked as known noise
because editing that file by hand is a protected-path trap.

Desired end state:

- Flux Operator GitOps-owned (`HelmRepository` + `HelmRelease` under
  `flux-system/`; Status UI SSO already live).
- A `FluxInstance` named `flux` in `flux-system` owns controller lifecycle and
  sync (`FluxInstance.spec.sync` mirrors current `gotk-sync.yaml`: GitLab SSH,
  `main`, path `./flux/manifests/01-bootstrap`, pullSecret
  `flux-operator-secrets` from 1Password — not the bootstrap-created
  `flux-system` Secret).
- Cutover via `kustomization.yaml` resource toggles (gotk commented out,
  `flux-instance.yaml` uncommented); manifests stay in tree until post-cutover
  cleanup.
- No long-lived dual ownership: do not enable `FluxInstance` while
  gotk-components is still listed in the kustomization.

## Acceptance

- Cluster reports a Ready `FluxInstance` / `FluxReport` managed by the
  operator (Flux MCP `get_flux_instance` succeeds).
- `gotk-components.yaml` is not a resource in the bootstrap kustomization;
  controllers remain Ready under operator ownership.
- Root sync matches today’s contract (same Git URL, branch, path) via
  `FluxInstance.spec.sync`, with pull credentials from 1Password
  (`flux-operator-secrets`: `identity` + `known_hosts`), not a separate
  hand-edited gotk-sync / bootstrap Secret.
- Operator chart is reconciled from Git (HelmRelease).
- Bootstrap docs describe cutover toggles + GitOps steady state; Trivy gotk
  deferral in `trivy-scan-noise-deferred.md` is revisited once the vendor
  file is unreferenced / gone.

## Feedback loop

- Flux MCP: `get_flux_instance` — instance present, distribution status
  Installed, sync ready.
- `flux check` / `kubectl get pods -n flux-system` — controllers Ready.
- `kubectl get gitrepository,kustomization -n flux-system flux-system` —
  objects exist; field/labels show operator management after cutover.
- Repo: no `gotk-components.yaml` (or not referenced); `kustomize build` on
  the replacement bootstrap path succeeds.
- Trivy on `flux/manifests/01-bootstrap/flux-system/` — gotk CRITICAL bucket
  gone or explicitly retired in the deferral issue.

## Implementation hint

Phased strict handoff (detail belongs in a plan, not here):

1. GitOps operator HelmRelease (done); Status UI SSO (done); stage
   `flux-instance.yaml` commented out of kustomization (done).
2. Soften root `flux-system` KS `prune: false` + `deletionPolicy: Orphan` in
   `gotk-sync.yaml` **before** commenting out gotk.
3. Comment out `gotk-components.yaml`; controllers remain in-cluster.
4. Uncomment `flux-instance.yaml`; operator adopts via SSA.
5. Comment out `gotk-sync.yaml`; tidy docs / Trivy deferral.

Do not enable `FluxInstance` while kustomize-controller is still applying
gotk to the same Deployments — the operator takes field ownership and that
overlap is contention, not a soft parallel.

Protected path: implementation edits under
`flux/manifests/01-bootstrap/**` need explicit operator confirm per
protected-paths rules.

## Notes

- Plan: `docs/plans/flux-operator-migration.md` (Phase A = this issue’s
  acceptance; Phase B = hypermind GitLab MR ResourceSet pilot — label
  `deploy/flux-preview` — so Renovate bumps can be smoked on-cluster before
  merge). Upstream:
  https://fluxoperator.dev/docs/resourcesets/gitlab-merge-requests/
- Cluster evidence (2026-07-26): root `flux-system` and `manifests`
  Kustomizations created `2025-11-15` with `prune: true`. Several child KS
  show much newer `creationTimestamp`s (2026-01 through 2026-06), which
  matches prior recreate pain after KS loss. Cutover must treat KS deletion
  with prune-on as a restore nightmare risk — flip prune (and deletion
  policy) before emptying or replacing bootstrap ownership.
- Related: `docs/issues/trivy-scan-noise-deferred.md` (gotk vendor noise).
- Out of scope for this issue’s acceptance: repo layout redesign, OCI sync,
  Terraform bootstrap module, auth model changes, multi-app preview platform.
