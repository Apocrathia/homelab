---
title: "generic-app: configurable Gatus uptime probe (default off)"
kind: feature
status: open
severity: medium
source: human
found_at: 2026-08-01
area: helm
slice: hitl
plan: docs/plans/gatus-cluster-uptime.md
---

# generic-app: configurable Gatus uptime probe (default off)

## Problem / desired state

demo-app opts into Gatus via a HelmRelease `postRenderers` Service patch.
That does not scale.

Desired (phase 2 after Gatus v1 merge): `generic-app` grows a first-class
`gatus:` values block that stamps Service annotations for
gatus-sidecar. **Default `enabled: false`.** demo-app bumps to the new chart
version and sets the block enabled (drop postRenderer).

More than a boolean — callers need to shape the probe without hand-writing
annotation YAML every time.

### Suggested values shape (starting point)

```yaml
gatus:
  enabled: false
  group: "" # default: app.name or a chart default like "apps"
  # Default URL when empty:
  #   http://{{ app.name }}.{{ namespace }}.svc:{{ service.port }}
  # (Service ports are tcp:// unless url forces http/https.)
  url: ""
  path: "" # appended to url when set
  interval: "" # optional; sidecar default otherwise
  conditions:
    - "[STATUS] == 200"
  # Escape hatch: merge arbitrary endpoint keys (headers, client, etc.)
  endpoint: {}
```

Chart renders `gatus.home-operations.com/enabled` +
`gatus.home-operations.com/endpoint` on the ClusterIP Service.

## Acceptance

- `gatus.enabled: false` (default) → no gatus annotations on Service
- `gatus.enabled: true` with defaults → HTTP in-cluster URL + status 200
  condition
- Overrides (`group`, `url`, `path`, `interval`, `conditions`, `endpoint`)
  appear in the endpoint annotation YAML
- Chart version bumped; demo-app uses new version with `gatus.enabled: true`
  and no `postRenderers`
- Documented in chart values comments / README

## Feedback loop

- `helm template` generic-app: enabled false / true / overrides
- demo-app HelmRelease template: Service has annotations; no postRenderer
- Live (after apply): Gatus shows demo-app green; scale-to-0 still alerts

## Implementation hint

Protected path: `helm/generic-app/**`. Touch Service template(s) that apps
actually use (ClusterIP at minimum). Keep annotation keys matching
gatus-sidecar defaults.

## Notes

- Supersedes the thinner “raw serviceAnnotations only” idea.
- Cluster-wide default-on is explicitly **not** this issue (`enabled` stays
  false by default).
- App wave after this: `docs/issues/gatus-annotate-app-wave.md`.
