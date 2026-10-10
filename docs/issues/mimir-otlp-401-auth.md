---
title: "Alloy→Mimir OTLP export 401s — all cluster OTLP metrics dropped"
kind: bug
status: open
severity: high
source: agent
found_at: 2026-08-26
found_by: agent (tailscale audit-log + tailscale2otel laps)
area: observability
slice: hitl
---

# Alloy→Mimir OTLP export 401s — all cluster OTLP metrics dropped

## Problem / desired state

Alloy's `otelcol.exporter.otlphttp "mimir"` block
(`flux/manifests/03-services/observability/alloy/configmap.yaml`) sends to the
Mimir distributor OTLP endpoint with **no tenant/auth header**:

```alloy
otelcol.exporter.otlphttp "mimir" {
  client {
    endpoint = "http://mimir-distributor.mimir-system.svc.cluster.local:8080/otlp"
    tls { insecure = true }
  }
}
```

Mimir answers `401 Unauthenticated` on every export and Alloy drops the batch.
Every OTLP metric from every app dies at this boundary: Mimir holds only
kube-prometheus-stack remote-write series (`prometheus_replica` labels) and
nothing else. The upstream tailscale2otel metric dashboards are permanently
empty; the operator's Loki-only dashboard is the only working view. The Oct 9
SIEM inventory line "tailscale2otel inventory metrics → Mimir" is wrong until
this is fixed.

## Repro

Live, ongoing (last verified 2026-10-10, all 4 alloy pods, ~every 60 s):

```text
kubectl logs -n alloy-system <alloy-pod> | grep mimir
{"level":"error","msg":"Exporting failed. Dropping data.","component_id":"otelcol.exporter.otlphttp.mimir",
 "error":"not retryable error: Permanent error: ... Unauthenticated ... request to
 http://mimir-distributor.mimir-system.svc.cluster.local:8080/otlp/v1/metrics
 responded with HTTP Status Code 401","dropped_items":175}
```

~175–176 items/min/pod (larger 1,381-item batches every few minutes on one
pod). First observed 2026-08-26/27; unchanged through 2026-10-10; the configmap
block last changed 2026-01-24 and still has no auth header on `origin/main`.

## Acceptance

- The mimir exporter block carries the same tenant/auth treatment the rest of
  the stack uses (everything else talks to Mimir through `mimir-gateway`, which
  injects the tenant).
- Alloy mimir-exporter error lines stop; no `dropped_items` in logs.
- OTLP metrics from apps appear in Mimir — e.g.
  `count by (__name__) ({__name__=~"tailscale.*"})` > 0, and tailscale2otel
  dashboards render metric panels.
- Tempo exporter reception checked during the same lap (traces go to
  `tempo-distributor:4317` with the same no-tenant shape — likely the same
  latent issue).

## Feedback loop

- `kustomize build` + `yamllint` on the alloy dir (read-only, local)
- `kubectl logs -n alloy-system <pod>` — exporter errors must stop (read-only)
- Grafana/Prometheus query: `count by (__name__) ({__name__=~"tailscale.*"})`
- Flux/HelmRelease status read — mutate (rollout) needs an operator ask

## Implementation hint

Designed fix (2026-09-22, one config block): give the exporter the tenant/auth
treatment — Option A: point at `http://mimir-gateway.mimir-system.svc:80/otlp`
(if the gateway proxies OTLP and injects `X-Scope-OrgID`), or Option B: keep
the distributor endpoint and add `headers = { "X-Scope-OrgID" = "<tenant>" }`
(tenant value: read the mimir HelmRelease + mimir-distributed chart defaults
during the lap; no explicit tenant config exists in repo values). Full
diagnosis and lap-2 (GitOps-vendor the dashboards) notes:
`.scratch/ts2otel-live-diagnosis.md`.

## Notes

- History: found 2026-08-26 (tailscale audit-log bring-up, session 01a0403e —
  "Want me to file the Mimir 401 issue first?" never answered); fully
  diagnosed 2026-09-22 (tailscale2otel dashboard lap, session 01a0c69a —
  "green-light laps 1 + 2?" never answered). Issue never filed until now;
  re-verified live 2026-10-10 (dropped-work sweep worker C + fresh pod logs).
- Lap 2 (GitOps-vendor the operator's UI-saved dashboard; upstream 41-panel
  metric set optional once metrics flow) stays out of scope here — it is
  blocked on lap 1 anyway.

**Next action (gate):** operator green-lights lap 1 — the one-config-block
exporter fix. Everything after that is verify-and-close.
