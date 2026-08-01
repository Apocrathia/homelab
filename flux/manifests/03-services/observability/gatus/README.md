# Gatus — in-cluster uptime monitoring

GitOps-defined synthetic checks for workloads **inside** the cluster. Complements
Uptime Kuma (LAN/network) and Uptime Robot (external inbound). Uses
[Gatus](https://github.com/TwiN/gatus) plus
[gatus-sidecar](https://github.com/home-operations/gatus-sidecar) for Service
discovery from annotations.

> **Navigation**: [← Back to Observability README](../README.md)

## Overview

This deployment includes:

- Official `gatus-sidecar` Helm chart (Gatus + one discovery sidecar)
- CNPG Postgres for check history (`gatus-postgres`)
- Authentik proxy for the UI
- Prometheus `ServiceMonitor` on `/metrics`
- Opt-in Service discovery (`--enable-service` only)

Gatus is a **separate** Flux Kustomization (`services-gatus`), not part of
`services-observability`, so the LGTM stack does not wait on CNPG.

## Access

- **URL**: `https://gatus.gateway.services.apocrathia.com`

## Configuration

Base Gatus settings (storage, metrics, web port) live in `configmap.yaml`.
Endpoint definitions come from Kubernetes Service annotations watched by the
sidecar — not from the ConfigMap.

### Opt in a Service

Annotate the Service (not the Deployment):

```yaml
metadata:
  annotations:
    gatus.home-operations.com/enabled: "true"
    gatus.home-operations.com/endpoint: |
      group: demo
      # Service ports default to tcp:// — set url for HTTP status checks.
      url: http://demo-app.demo-app.svc:80
      conditions:
        - "[STATUS] == 200"
```

Without an explicit `url:`, the sidecar emits `tcp://<svc>.<ns>.svc:<port>`
from the Service port protocol. Override with `http://` / `https://` when you
want status/body conditions. Probes stay in-cluster and bypass Authentik.
Do not use hostname/HTTPRoute discovery for Authentik-fronted apps without
`guarded` / path conditions — login pages return HTTP 200.

### Secrets

Create a 1Password item at `vaults/Secrets/items/gatus-secrets` with:

| Field      | Purpose                        |
| ---------- | ------------------------------ |
| `username` | CNPG role / Gatus DB user      |
| `password` | CNPG role password / Gatus DSN |

CNPG bootstrap and the Gatus container both consume this Secret.

## Authentication

Authentik proxy outpost (Platform group). Chart `httpRoute` / `ingress` stay off;
the outpost owns the Gateway API route.

## Metrics

ServiceMonitor label `release: kube-prometheus-stack`. Sample series:

- `gatus_results_endpoint_success{group,name,type}` — `1` healthy / `0` failing

### Alerts

`grafana.yaml`:

- **5m** `Gatus endpoint down` → Discord (firing only, no resolve)
- **1h** `Gatus endpoint down prolonged` → Homelab Agent (`agent_invoke: true`)

New annotated Services inherit both rules via `gatus_results_endpoint_success`.

### Dashboard

Grafana.com dashboard [24379](https://grafana.com/grafana/dashboards/24379-gatus/)
imported into the **Uptime** folder.

## Troubleshooting

```bash
kubectl get pods -n gatus
kubectl logs -n gatus deploy/gatus -c gatus -f
kubectl logs -n gatus deploy/gatus -c gatus-sidecar -f
kubectl get cluster -n gatus
kubectl get pods -n authentik | grep gatus
```

## References

- **[Gatus](https://github.com/TwiN/gatus)** — health dashboard
- **[gatus-sidecar](https://github.com/home-operations/gatus-sidecar)** — K8s discovery sidecar
- **[Plan](../../../../../docs/plans/gatus-cluster-uptime.md)** — design decisions
