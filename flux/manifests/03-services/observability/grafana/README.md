# Grafana Operator

The Grafana Operator manages dashboards and datasources for the existing kube-prometheus-stack Grafana instance through Kubernetes Custom Resources.

> **Navigation**: [← Back to Observability README](../README.md) · [Agent instructions →](./AGENTS.md)

## Overview

This deployment installs the Grafana Operator using the official Helm chart from the Grafana repository. The operator connects to the existing kube-prometheus-stack Grafana instance and enables:

- Dashboard management through `GrafanaDashboard` CRDs
- Datasource management through `GrafanaDatasource` CRDs
- Service account management through `GrafanaServiceAccount` CRDs
- GitOps-friendly dashboard deployment
- Import from Grafana.com dashboards

## Architecture

- **Grafana UI**: Provided by kube-prometheus-stack in `prometheus-system` namespace
- **Grafana Operator**: Manages external Grafana instance via `Grafana` CRD
- **Dashboard Management**: CRD-based dashboard deployment and synchronization

## Usage

### Creating Dashboards

Deploy dashboards using `GrafanaDashboard` CRDs:

```yaml
apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDashboard
metadata:
  name: my-dashboard
  namespace: grafana-system
spec:
  instanceSelector:
    matchLabels:
      app: grafana
  grafanaCom:
    id: 22928 # Import from Grafana.com
```

### Managing Datasources

Configure datasources using `GrafanaDatasource` CRDs:

```yaml
apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDatasource
metadata:
  name: prometheus-datasource
  namespace: grafana-system
spec:
  instanceSelector:
    matchLabels:
      app: grafana
  json: |
    {
      "name": "Prometheus",
      "type": "prometheus",
      "url": "http://prometheus-k8s.prometheus-system.svc:9090"
    }
```

### Managed datasources

Datasources deployed by this folder ([`datasources/`](./datasources/)):

- `homeassistant` — InfluxDB (Home Assistant), InfluxQL
- `ocsf-clickhouse` — ClickHouse OCSF query store via the pinned
  `grafana-clickhouse-datasource@4.20.0` catalog plugin (kube-prometheus-stack
  `grafana.plugins:` value), native protocol on the `clickhouse-tenzir` service

Secrets never land in git: every CR substitutes `${field-name}` placeholders
from the `grafana-secrets` Secret (1Password item
`vaults/Secrets/items/grafana-secrets`) through the operator's `valuesFrom`.

## Token sync to 1Password

Two ESO PushSecrets mirror grafana-operator service-account tokens into 1Password so the vault stays the paste source for `gcx login`:

- [`push-secret-mcp.yaml`](./push-secret-mcp.yaml): Secret `mcp-server-token` → item `grafana-mcp-service-account`
- [`push-secret-gcx.yaml`](./push-secret-gcx.yaml): Secret `gcx-token` → item `homelab-gcx-token` (pre-created `API_CREDENTIAL`; the update path preserves category, the create path would hardcode `SERVER`)

Both use `refreshInterval: 168h` with `deletionPolicy: None`. ESO v2.12 PushSecret PUTs the provider item on every reconcile even when the value is unchanged, which bumps the item's updated-at and floats it to the top of the vault list — so the refresh interval IS the bump frequency until upstream adds change-gating. Tokens rotate rarely; convergence is ≤7 days, and a stale vault token fails closed (401 in gcx) and heals on the next reconcile.

`gcx-service-account.yaml` is the dedicated Grafana service account for gcx consumers, decoupled from the mcp-server account.

## References

- **[Grafana Operator Documentation](https://grafana.github.io/grafana-operator/docs/)** - Primary documentation source
- **[GitHub Repository](https://github.com/grafana/grafana-operator)** - Source code and issues
