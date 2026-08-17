---
title: "Renovate operator: shadow, then replace Renovate CE"
status: active
found_at: 2026-08-17
updated_at: 2026-08-17
area: flux
---

# Renovate operator: shadow, then replace Renovate CE

## Goal

Move dependency automation from Mend Renovate CE (license-bound, single-pod
sequential runs) to the mogenius renovate-operator (Apache-2.0, CRD-driven,
job-per-repo). Two laps: shadow first to prove the loop with zero MR risk,
then cut over. Origin: Obsidian Running Notes, "New Apps to Deploy".

## Scope

**In scope:**

- Shadow deploy of renovate-operator in `renovate-operator` namespace
  (branch `feat/renovate-operator-shadow`)
- `RenovateJob` `homelab-shadow` with a discovery filter that matches no real
  project (zero MRs while Mend CE stays the only live bot)
- Web UI on the Gateway with Authentik OIDC (never routed unauthenticated)
- Cutover: flip `discoveryFilters` to `Apocrathia/*`, validate real runs,
  remove the Mend CE deployment

**Out of scope:**

- `renovate.json` behavior changes (grouping, immutable-tag pinning are
  separate items on the Obsidian list and are runner-agnostic)
- Webhook-triggered runs (schedule-only for now)
- Valkey-backed log storage and metrics (post-cutover hardening)

## Decisions

- Shadow with non-matching filter — empty filter would autodiscover the whole
  group and double-open MRs against CE; a junk filter exercises discovery
  with zero executor jobs. Reversible by one-line filter change.
- Namespace-scoped RBAC (`rbac.ownNamespaceOnly: true`) — all spawned jobs
  live in the operator namespace; no ClusterRole for the operator.
- Policy engine on at install — `policy.enabled: true`; defaults already
  allow gitlab.com and the renovate/renovatebot images.
- Reuse `renovate-secrets` 1Password item — operator wants `RENOVATE_TOKEN` /
  `GITHUB_COM_TOKEN` keys; same PAT values as `gitlab-token` / `github-token`.
- UI routed via Gateway with OIDC from day one — the operator serves the UI
  unauthenticated without an auth provider, so exposure only happens with
  Authentik OIDC configured. Admin access limited to `kubernetes-admins`.
- Job image `ghcr.io/renovatebot/renovate` — avoids Docker Hub rate limits;
  in policy `allowedImages`.

## Steps

- [x] Shadow manifests + HelmRepository + registrations (merged, !3889)
- [x] Web UI via Gateway + Authentik OIDC blueprint (merged, !3889)
- [x] CRD-ordering fix: `RenovateJob` moved to `config/` with its own Flux
      Kustomization depending on the operator one — applying the CR and the
      CRD-installing HelmRelease from the same Kustomization deadlocks
      (CR dry-run failure aborts the apply before the HelmRelease exists)
- [x] Operator adds fields to the `renovate-secrets` 1Password item:
      `RENOVATE_TOKEN` + `GITHUB_COM_TOKEN` (same values as `gitlab-token` /
      `github-token`) and a generated `oidc-session-secret` — without the
      first, discovery jobs fail auth
- [x] Merge shadow MR; confirm Flux reconciles `services-renovate-operator`
- [ ] Copy the Authentik provider's client ID + secret into `oidc-client-id`
      / `oidc-client-secret` on the same 1Password item (blueprint creates
      the provider on apply; UI login fails until this is done)
- [ ] Validate shadow: operator pod healthy, daily discovery job runs,
      `RenovateJob` status shows zero projects, OIDC login works at
      https://renovate.gateway.services.apocrathia.com
- [ ] Cutover MR: `discoveryFilters: ["Apocrathia/*"]`, suspend/remove the
      Mend CE HelmRelease + flux-kustomization entry
- [ ] Watch first real runs; confirm no duplicate MRs on repos CE already
      touched (branch/MR names are deterministic, expect reuse not dupes)
- [ ] Tear down CE: delete `03-services/renovate/`, its root kustomization
      entry, the `renovate` HelmRepository, and the CNPG cluster
- [ ] Vault cleanup after CE teardown: remove the CE-only fields
      (`gitlab-token`, `github-token`, `license-key`, `webhook-secret`,
      `api-secret`) from `renovate-secrets`, leaving the operator-convention
      names (`RENOVATE_TOKEN`, `GITHUB_COM_TOKEN`, `oidc-*`)
- [ ] Close the Obsidian "renovate-operator" item; decide on UI/OIDC and
      webhook as follow-ups

## Feedback loop

- `helm template renovate-operator .scratch/renovate-operator-chart/renovate-operator --values <hr values>`
- `kubectl kustomize flux/manifests/03-services/renovate-operator/`
- `pre-commit run --files <changed files>`
- `kubectl get renovatejobs -n renovate-operator` and
  `kubectl describe renovatejob homelab-shadow -n renovate-operator` (read-only)
- `kubectl get jobs -n renovate-operator` — discovery jobs only during shadow

## Notes

- Chart pulled to `.scratch/renovate-operator-chart/` for review (6.0.0).
- Known CE wart carried into cutover watch: the
  `renovate/ghcr.io-lklynet-hypermind-swarm-1.x` branch fails to update every
  run — fix or drop that pin separately.
- Kyverno `cleanup-*-jobs` policies reap finished Jobs after 24h; enable the
  operator's log storage (valkey/S3) if job logs must live longer.
