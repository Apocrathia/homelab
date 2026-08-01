---
title: "Gatus: annotate a first wave of in-cluster apps"
kind: feature
status: open
severity: medium
source: human
found_at: 2026-08-01
area: observability
slice: hitl
plan: docs/plans/gatus-cluster-uptime.md
---

# Gatus: annotate a first wave of in-cluster apps

## Problem / desired state

Gatus is proven on demo-app. Most in-cluster apps are not monitored yet.

Desired (phase 3): enable `gatus:` on a small platform/services wave via
generic-app values (after phase 2 chart support). Stay opt-in —
`enabled: false` remains the chart default.

## Acceptance

- At least 3–5 additional workloads besides demo-app appear green in Gatus UI
- Each uses in-cluster HTTP Service URL (bypasses Authentik)
- Existing Grafana rule covers them without new alert CRs

## Feedback loop

- Gatus UI / endpoint statuses show new endpoints `success=true`
- `gatus_results_endpoint_success` series present for each

## Implementation hint

Blocked on [`generic-app-gatus-values`](./generic-app-gatus-values.md). Prefer
simple HTTP health first. No `--auto-*` discovery.

## Notes

Hostname / HTTPRoute discovery stays deferred (Authentik false greens).
