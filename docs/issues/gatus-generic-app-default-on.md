---
title: "Gatus: flip generic-app default to enabled"
kind: feature
status: open
severity: medium
source: human
found_at: 2026-08-01
area: observability
slice: hitl
plan: docs/plans/gatus-cluster-uptime.md
---

# Gatus: flip generic-app default to enabled

## Problem / desired state

Phase 2 opts apps in one-by-one. Most `generic-app` workloads should be
monitored without per-app `enabled: true`.

Desired (phase 3): `gatus.enabled` defaults to `true` in
`helm/generic-app`. Apps that must stay dark set `enabled: false`.

## Acceptance

- Chart default `gatus.enabled: true` (chart version bump)
- Explicit opt-out list for Jobs-ish / no-HTTP / noisy apps documented in
  chart README or values comments
- Existing opted-in apps still green; newly covered apps appear in Gatus
  without per-app enable flips (except opt-outs)
- No mass false Discord alerts from known-bad defaults (root `/` on apps
  that need a health path)

## Feedback loop

- `helm template` with empty `gatus:` → annotations present
- `gatus.enabled: false` → no annotations
- Cluster: sample of previously-unmonitored apps show
  `gatus_results_endpoint_success`

## Implementation hint

Protected path: `helm/generic-app/**`. Needs operator confirm before edit.
Blocked on phase 2 wave stability
([`gatus-annotate-app-wave`](./gatus-annotate-app-wave.md)).

## Notes

Health `path` still needs per-app overrides where `/` is wrong — default-on
does not remove that tax for non-root health endpoints.
