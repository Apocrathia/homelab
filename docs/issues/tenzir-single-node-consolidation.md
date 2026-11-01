---
title: Tenzir single-node consolidation (pipelines-only model)
kind: architecture
status: blocked
severity: medium
source: agent
found_at: 2026-11-01
area: security
slice: hitl
---

# Tenzir single-node consolidation (pipelines-only model)

## Problem / desired state

The seven standalone tenzir nodes (core, enrichment, intel,
introspection, investigations, netflow, tetragon) exist as our scaling
workaround from before the platform had a distributed story: one
function per HelmRelease, manual GitOps wiring, and node-level
resource envelopes that duplicate isolation the platform will
eventually provide natively.

Desired state: one consolidated plane where we define pipelines only,
not nodes — a single node today, a single Git-backed "deployment" at
the December relaunch. The functional split becomes unnecessary once
upstream pipelines can span nodes; a future horizontal rescale is a
file move per pipeline, not a data migration (stateless + CH-direct
already landed).

## Dependency (what blocks this)

Upstream tenzir cross-node communication / distributed pipeline
execution. Vendor-stated 2026-10-21: IPC in progress, "scale
vertically inside a node until then", single pipelines spanning nodes
once it lands; earlier signal was Q1 2027. The December relaunch
(Git-backed deployments) is the adjacent milestone. Nothing public as
of 2026-11-01 — release notes carry no IPC GA yet.

Unblock signal: upstream release notes / changelog GA the IPC layer,
or vendor confirmation via the Slack Connect channel.

## Acceptance

- Upstream cross-node IPC / distributed execution is GA.
- The 7 HelmReleases render as 1 (or the deployments-model
  equivalent: one pipeline tree) with all 45 pipelines live.
- record_integrity attest/verify walkers green across merged lanes
  (per-lane chain scoping; no finding-feedback loops).
- Sigma findings-rate within baseline for core feeds; deliberate,
  verified handling of netflow/tetragon inputs.
- Diagnostics lanes RUNNING on the merged node; Grafana re-planned
  for the `node`-label collapse.
- 59/59 package tests; CH row continuity across every moved pipeline.

## Feedback loop

- kustomize build of the apps-security kustomization
- Full pre-commit sweep on changed paths
- Package tests (59/59) + attest probe fixtures
- Read-only Flux / HelmRelease + diagnostics checks post-merge;
  cluster mutation needs operator permission per lap

## Implementation hint

Design (wave structure, gates, merged-node sizing) is intentionally
deferred to unblock time — the distributed model may change the how
entirely.

## Notes

- Sizing evidence 2026-11-01 (Mimir, read-only): tetragon flood peak
  11.89Gi — its 12Gi limit is measured, not padding; coincident
  fleet peak 16.91Gi / 4.54 CPU over 14d; workers 4 × 16 CPU / 64Gi.
- Operator 2026-11-01: no changes now; park as blocked and do one
  topology churn when the distributed model is ready.
