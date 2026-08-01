---
title: "Gatus: annotate a first wave of in-cluster apps"
kind: feature
status: in-flight
severity: medium
source: human
found_at: 2026-08-01
area: observability
slice: hitl
plan: docs/plans/gatus-cluster-uptime.md
branch: feat/gatus-annotate-app-wave
---

# Gatus: annotate a first wave of in-cluster apps

## Problem / desired state

Gatus is proven on demo-app. Most in-cluster apps are not monitored yet.

**Phase numbering** (post chart support):

| Phase              | Scope                                                                |
| ------------------ | -------------------------------------------------------------------- |
| 1 (done)           | Gatus deploy + `generic-app` `gatus:` (default **false**) + demo-app |
| **2 (this issue)** | First wave: opt-in on selected **generic-app** workloads             |
| 3                  | [`gatus-generic-app-default-on`](./gatus-generic-app-default-on.md)  |
| 4                  | [`gatus-non-generic-app-gaps`](./gatus-non-generic-app-gaps.md)      |

Desired (phase 2): enable `gatus:` on the shortlist below via `generic-app`
values (chart ≥ 0.0.75). Stay opt-in for this lap.

## Shortlist

Paths match existing kube probes where present. Chart URL uses **Service**
port + `path`.

| App            | Group        | `path`        | Notes                                 |
| -------------- | ------------ | ------------- | ------------------------------------- |
| `rclone`       | productivity | `/health`     | Service :8080                         |
| `silverbullet` | productivity | `/.ping`      | Service :80 → pod :3000               |
| `wakapi`       | productivity | `/api/health` | Service :3000                         |
| `searxng`      | productivity | _(root)_      | No dedicated health; expect `/` → 200 |
| `terminus`     | home         | `/up`         | Service :80 → pod :2300               |
| `amp-exporter` | games        | `/healthz`    | Service :9822                         |

`demo-app` already enabled — not counted toward acceptance.

## Acceptance

- Shortlist apps appear green in Gatus UI
- Each uses in-cluster HTTP Service URL (bypasses Authentik)
- Chart bumped to ≥ 0.0.75; `gatus.enabled: true` + path/group as needed
- Existing Grafana rules cover them without new alert CRs

## Feedback loop

- Gatus UI / endpoint statuses show new endpoints `success=true`
- `gatus_results_endpoint_success` series present for each
- `helm template` on each HelmRelease values → Service has gatus annotations

## Implementation hint

```yaml
gatus:
  enabled: true
  group: productivity # or home / games
  path: /health # omit for searxng
```

No `--auto-*` discovery. No non-generic-app / postRenderers in this phase.

## Notes

Hostname / HTTPRoute discovery stays deferred (Authentik false greens).
