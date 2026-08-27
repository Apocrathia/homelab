# tailscale2otel - Tailscale Audit Logs & Metrics

This directory contains the deployment configuration for
[tailscale2otel](https://github.com/rknightion/tailscale2otel), a singleton
exporter that polls the Tailscale API and ships tailnet telemetry over OTLP.

> **Navigation**: [← Back to Observability README](../README.md)

## Architecture

tailscale2otel is deployed as a single-replica Deployment (the chart enforces
`replicaCount: 1` — a second replica would double-emit every metric and log):

- Polls the **configuration audit log** API (who changed what, when, with
  policy-file diffs) plus tailnet inventory collectors (devices, users, keys,
  ACL, DNS, settings)
- Pushes OTLP to the Alloy ingest service (`alloy.alloy-system.svc:4318`):
  audit events land in **Loki**, inventory metrics in **Mimir**
- Network flow logs are **disabled** — they require a Premium/Enterprise plan
  and this tailnet is on the free plan

## Prerequisites (one-time, outside Git)

1. **OAuth client**: create one in the Tailscale admin console (Settings →
   OAuth), named e.g. `tailscale2otel`, with the `all:read` scope. Do not
   reuse the k8s-operator client — its scopes differ and its credentials live
   in a different item.
2. **1Password item**: create `tailscale2otel-secrets` in vault `Secrets` with
   exactly these field labels (they become the Secret keys, and the chart
   injects every key as an env var):

   | Field label                                     | Value               |
   | ----------------------------------------------- | ------------------- |
   | `TS2OTEL_TAILSCALE__AUTH__OAUTH__CLIENT_ID`     | OAuth client ID     |
   | `TS2OTEL_TAILSCALE__AUTH__OAUTH__CLIENT_SECRET` | OAuth client secret |

Until the item exists the HelmRelease install will fail waiting on the Secret.

## Configuration

Chart values live in [`helmrelease.yaml`](./helmrelease.yaml). Notable knobs:

- `config.otlp.endpoint` — OTLP push target (Alloy ingest)
- `config.collectors.*.interval` — per-collector poll cadence (audit: 60s
  default, 60s tail lag, 5m cold-start lookback, checkpointed cursors)
- `persistence.enabled` — swap the checkpoint emptyDir for a PVC (optional;
  without it a reschedule re-polls the 5m lookback window)

## Troubleshooting

```bash
kubectl get helmrelease -n tailscale2otel
kubectl get pods -n tailscale2otel
kubectl logs -n tailscale2otel -l app.kubernetes.io/name=tailscale2otel
```

The exporter's admin server (`:9091`) serves `/healthz`, `/readyz`, and a
status page, but the chart renders no Service — `kubectl port-forward` to the
pod if you want it.

Audit events in Grafana: query Loki for the `tailscale2otel` exporter labels
(e.g. `{exporter="tailscale2otel"}`) and filter on audit log records.

## References

- [tailscale2otel docs](https://m7kni.io/tailscale2otel/)
- [Configuration reference](https://m7kni.io/tailscale2otel/configuration/)
- [Tailscale configuration audit logging](https://tailscale.com/docs/features/logging/audit-logging)
