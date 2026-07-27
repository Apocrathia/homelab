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
# plan: # file in a later session — docs/plans/flux-operator-migration.md
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

- Flux Operator installed once via break-glass (manual Helm/manifest apply —
  same class of bootstrap we already do by hand).
- Operator then GitOps-owned (`HelmRelease` / `ResourceSet` in-repo).
- A `FluxInstance` named `flux` in `flux-system` owns controller lifecycle and
  sync (`FluxInstance.spec.sync` mirrors current `gotk-sync.yaml`: GitLab SSH,
  `main`, path `./flux/manifests/01-bootstrap`, existing `flux-system` secret).
- Vendored `gotk-components.yaml` and classic `gotk-sync.yaml` are gone from
  Git once the CR owns those objects.
- No long-lived dual ownership: `FluxInstance` is not created while gotk is
  still being applied to the same controller Deployments.

## Acceptance

- Cluster reports a Ready `FluxInstance` / `FluxReport` managed by the
  operator (Flux MCP `get_flux_instance` succeeds).
- `gotk-components.yaml` is not a resource in the bootstrap kustomization;
  controllers remain Ready under operator ownership.
- Root sync matches today’s contract (same Git URL, branch, path, pull secret
  name) via `FluxInstance.spec.sync`, not a separate hand-edited gotk-sync.
- Operator chart is reconciled from Git after the initial break-glass install.
- Bootstrap docs describe break-glass install + GitOps steady state; Trivy
  gotk deferral in `trivy-scan-noise-deferred.md` is revisited once the vendor
  file is gone.

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

1. Break-glass install operator; leave gotk alone (true parallel).
2. GitOps-adopt the operator only; still no `FluxInstance`.
3. Set root `flux-system` Kustomization `prune: false` (and consider
   `deletionPolicy: Orphan`) **before** removing gotk from desired state so
   controller objects are not GC’d if the KS is deleted or emptied.
4. Remove `gotk-components` from Git; controllers remain in-cluster.
5. Apply `FluxInstance` (with sync mirroring gotk-sync); operator adopts via
   SSA.
6. Remove `gotk-sync.yaml`; tidy docs / Trivy deferral.

Do not apply `FluxInstance` while kustomize-controller is still applying
gotk to the same Deployments — the operator takes field ownership and that
overlap is contention, not a soft parallel.

Protected path: implementation edits under
`flux/manifests/01-bootstrap/**` need explicit operator confirm per
protected-paths rules.

## Notes

- Plan authoring is deferred to a separate session; link via `plan:` when
  `docs/plans/flux-operator-migration.md` exists.
- Cluster evidence (2026-07-26): root `flux-system` and `manifests`
  Kustomizations created `2025-11-15` with `prune: true`. Several child KS
  show much newer `creationTimestamp`s (2026-01 through 2026-06), which
  matches prior recreate pain after KS loss. Cutover must treat KS deletion
  with prune-on as a restore nightmare risk — flip prune (and deletion
  policy) before emptying or replacing bootstrap ownership.
- Related: `docs/issues/trivy-scan-noise-deferred.md` (gotk vendor noise).
- Out of scope for this issue’s acceptance: repo layout redesign, OCI sync,
  Terraform bootstrap module, auth model changes.
