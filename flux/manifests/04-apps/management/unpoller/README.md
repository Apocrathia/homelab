# UnPoller

UniFi metrics collector for Prometheus and Grafana.

> **Navigation**: [← Back to Management README](../README.md)

## Overview

UnPoller collects metrics from UniFi controllers and exports to Prometheus, InfluxDB, Loki, and Datadog; this deployment uses Prometheus and Grafana.

## Configuration

### UniFi Controller Credentials

The UniFi controller credentials are stored in 1Password and referenced via the `unpoller-secrets` OnePasswordItem:

- **Vault**: Secrets
- **Item**: unpoller-secrets
- **Fields**:
  - `unifi-user`: UniFi controller username
  - `unifi-pass`: UniFi controller password

### Configuration Method

Environment variables in the HelmRelease, per the [UnPoller configuration
documentation](https://unpoller.com/docs/install/configuration); credentials
come from 1Password via `valueFrom.secretKeyRef`.

### Metrics Collection

UnPoller exposes metrics on port 9130 for:

- **Prometheus**: Metrics scraping via ServiceMonitor
- **Grafana**: Pre-built dashboards for UniFi monitoring
- **Loki**: Events, alarms, anomalies, and IDS data export

## Troubleshooting

```bash
# Pod status
kubectl get pods -n unpoller

# Application logs
kubectl logs -n unpoller deployment/unpoller -f

# Check ServiceMonitor
kubectl get servicemonitor -n unpoller

# Check metrics endpoint
kubectl port-forward -n unpoller deployment/unpoller 9130:9130
curl localhost:9130/metrics
```

## References

- **[UnPoller Documentation](https://unpoller.com/docs/)** - Official documentation
- **[Configuration Guide](https://unpoller.com/docs/install/configuration)** - Configuration options
- **[Grafana Dashboards](https://grafana.com/grafana/dashboards/?search=unpoller)** - Pre-built dashboards
