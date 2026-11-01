---
title: Tenzir single-node consolidation
status: blocked
found_at: 2026-11-01
updated_at: 2026-11-01
area: security
---

# Tenzir single-node consolidation

## Goal

Consolidate the seven standalone tenzir nodes into one big node —
vertical scaling now, horizontal rescale when upstream ships
distributed execution. Cross-node IPC is unfinished (vendor
2026-10-21: "scale vertically inside a node until then"), and the
December relaunch turns nodes into Git-backed "deployments" (TQL
pipeline tree + package lock). One node now = one deployment at the
relaunch instead of seven. Rescaling later is a file move per
pipeline, not a data migration: the stateless migration
([tenzir-stateless-migration](./tenzir-stateless-migration.md)) made
data location-independent, so topology is the only moving part.

## Scope

**In scope:**

- Merging node HelmReleases into one release, wave by wave
- Context/chain namespacing where co-located pipelines collide
- Merged-node resource sizing and placement
- Observability re-plan where the `node` label dies
- Bus shape (keep pub/sub; fork/merge refactor deferred to the
  vendor config-review verdict)

**Out of scope:**

- ClickHouse replica load imbalance and CH version currency
  (separate threads)
- SigmaHQ parked corpus (16 rules) — stays parked
- The December relaunch platform migration itself (mapped, not
  executed here)

## Decisions

- **Parked until upstream cross-node IPC ships** — operator call
  2026-11-01: no changes now, filed as a blocked issue. One topology
  churn at the distributed model instead of merge-now / re-split
  later. Unblock signal: upstream release notes or vendor
  confirmation (Slack Connect channel). Tracked in
  [tenzir-single-node-consolidation](../issues/tenzir-single-node-consolidation.md).
- **One node pre-distributed; rescale after** — operator frame
  2026-11-01. Reversible by construction (stateless + CH-direct).
- **Waves, not one 7→1 lap** — regressions stay attributable; the
  two hard gates (tetragon flood containment, investigations security
  surface) run on upstream's and security-review's clock regardless.
- **Keep the unified pub/sub bus through consolidation** — upstream
  calls it an auto-parallelization barrier but "not banned"
  (2026-10-21); the fork/merge refactor is gated on the vendor
  config-review verdict plus measured need.
- **Sizing follows live data, not limit sums** — see Notes. The
  consolidation win is topology, not resources; fleet requests were
  already minimal.

## Steps

- [ ] **Wave 0 — v6.20.1 node bump.** Nodes sit one security patch
      behind the trivy sidecars (eMudhra leaked-CA-distrust,
      2026-10-30). Lands via Renovate (operator 2026-11-01); confirm
      the bump before wave 1.
- [ ] **Wave 1 — fold enrichment, intel, introspection into core**
      (7 → 4 releases; 9 pipelines move). - Per-pipeline re-home: land on core → verify CH row
      continuity + diagnostics lane RUNNING (server-side
      query_log, never pipeline_list) → delete from old release →
      next. - Context namespace pass: `geo-open` (3 nodes today) and
      `ocsf-osint` (2 nodes) collide on one process. - Fold env secret refs (fleetdm-token, opencti-taxii-token)
      into the merged release — 1Password Item refs only. - Findings-rate baseline before/after. Sigma inputs must not
      change in this wave; verify pull-plane pipelines publish
      nothing into the bus sigma reads.
- [ ] **Wave 2 — netflow in** (4 → 3 releases; 7 pipelines + the
      `tenzir-ingest-lb` LoadBalancer on 2055/UDP move). - Sigma evaluates flow events for the first time. No rule
      targets netflow fields today — findings-rate watch confirms. - netflow chain_uid + verify walk join the process;
      chain_uid-scoped walking is the proven pattern across shared
      tables.
- [ ] **Observability re-plan** (as waves land): `node` label
      collapse (same-id pushers collide on one series), diagnostics
      pairs shrink, Node Pipelines dashboard regroup, `internal`
      label share shifts.
- [ ] **Gate A → Wave 3 — tetragon in** (3 → 2 releases). Gate:
      upstream pipeline-scoped isolation ships, or we accept
      subprocess-only containment (`pipeline-subprocesses: true`) +
      flood-sized limits + a sigma suppression pass. Today's knobs
      (`active-partition-timeout`, `index.lazy-sketches`,
      `load-concurrency`, listener `parallelism`) are process-wide
      and would apply to every pipeline on the node.
- [ ] **Gate B → Wave 4 — investigations merge-or-stay** (2 → 1, or
      stays 2). Security review first: agent-facing web API :5160,
      `disable-plugins: [shell, python, to_file]` vs the merged
      node's plugin use, dedicated CH users, NetworkPolicy scoping.
      May legitimately remain its own December deployment.
- [ ] **Post-relaunch mapping.** When the Git-backed deployments
      model ships: one node = one deployment; horizontal rescale =
      moving pipeline files into new deployment trees.

## Feedback loop

- `kustomize build` of the apps-security kustomization — renders
  clean
- Full `pre-commit` sweep on changed paths (operator standing rule)
- Package tests (59/59) + two-record attest probe on changed stamps
- Read-only post-merge checks: HelmRelease ready, diagnostics lanes
  RUNNING, CH row continuity, findings-rate in Grafana
- Cluster mutation at execution time needs operator permission per
  lap

## Notes

- **Sizing evidence (2026-11-01, Mimir 14d, read-only):**
  coincident fleet peak (all 7 pods summed at one moment): 16.91Gi /
  4.54 CPU over 14d; 10.71Gi over the last 3d. Waves-1/2 node set
  (tetragon + investigations out): 10.85Gi / 2.03 CPU over 14d;
  7.74Gi last 3d. Tetragon's own 14d peak is 11.89Gi — its 12Gi
  limit is a measured flood envelope, not padding (2026-10-27
  direct-legs window, ~244k rows/15m). Core's 7.99Gi 14d peak is the
  fixed walker-churn era (verify window 24h → 90m); core peaks
  ~3.2Gi now. Workers are 4 × 16 CPU / 64Gi — any one absorbs the
  merged node.
- **Merged-node sizing (draft):** waves-1/2 node: requests ~1 CPU /
  4Gi, limits 4 CPU / 12Gi. 4 CPU holds (coincident peak 2.03); 8Gi
  memory would sit at the current envelope with zero margin (7.74Gi
  3d peak). Full merge at Gate A: expect ~6 CPU / 20Gi to survive a
  repeat flood without killing the tetragon leg; re-derive then. The
  pressure valve is `pipeline-subprocesses: true` on the merged node
  (already tetragon's config; upstream docs: subprocess pipelines
  "don't share fate" and vertical scaling gets more efficient) —
  under a tight cap an extreme flood OOMs the tetragon subprocess
  (restart-on-error recovers it) instead of the whole node.
- Session artifacts (gitignored scratch):
  `.scratch/tenzir-consolidation/` — decision brief plus three scout
  reports (transcript mining, repo survey, upstream research).
- TQL landmines for any surgery: a fork-ending pipeline is
  boot-fatal; consecutive statements chain output→input;
  if-expressions carry an implicit `else null`.
- December relaunch details are vendor-stated (public nowhere as of
  2026-11-01); plan against them, don't hard-depend.
