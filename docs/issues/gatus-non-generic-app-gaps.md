---
title: "Gatus: cover non-generic-app Helm deployments"
kind: feature
status: open
severity: medium
source: human
found_at: 2026-08-01
area: observability
slice: hitl
plan: docs/plans/gatus-cluster-uptime.md
---

# Gatus: cover non-generic-app Helm deployments

## Problem / desired state

`generic-app` defaults `gatus.enabled: true` (chart ≥ 0.0.76). Foreign Helm
charts (Authentik, LiteLLM, Headlamp, Immich, Open WebUI, …) stay dark unless
annotated another way.

Desired (phase 4): fill gaps on selected non-`generic-app` HelmReleases.

## Acceptance

- At least 3–5 high-value foreign charts monitored in Gatus
- Prefer chart-native Service / common annotations over `postRenderers`
- At most sparse use of `postRenderers` (escape hatch, not the pattern)
- In-cluster HTTP URLs; existing Grafana rules cover them

## Feedback loop

- Gatus UI green for each target
- `gatus_results_endpoint_success` series present

## Implementation hint

Phases 1–3 are done. Remaining set is truly "gaps", not the whole catalog.

Candidates (not committed): `litellm`, `openwebui`, `headlamp`, `immich`,
`qdrant`, `renovate`.

## Notes

Skip bootstrap/infra operators (cilium, cert-manager, longhorn, …) unless
there is a clear HTTP health surface worth the noise.
