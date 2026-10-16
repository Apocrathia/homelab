# Grafana Operator

The Grafana Operator manages dashboards and datasources for the existing kube-prometheus-stack Grafana instance through Kubernetes Custom Resources.

> **Navigation**: [← Back to Observability README](../README.md)

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

## Token sync to 1Password

[`push-secret.yaml`](./push-secret.yaml) mirrors the grafana-operator service-account token (Secret `mcp-server-token`, ns `prometheus-system`) into the 1Password item `grafana-mcp-service-account` (vault `Secrets`, field `token`) every hour, keeping the vault copy fresh when the operator rotates the token. That vault item is the paste source for `gcx login` against the homelab Grafana.

## References

- **[Grafana Operator Documentation](https://grafana.github.io/grafana-operator/docs/)** - Primary documentation source
- **[GitHub Repository](https://github.com/grafana/grafana-operator)** - Source code and issues
