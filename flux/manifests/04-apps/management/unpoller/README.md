# UnPoller

UniFi network monitoring and metrics collection system that exports data to Prometheus and Grafana.

> **Navigation**: [← Back to Management README](../README.md)

## Overview

UnPoller collects metrics from Ubiquiti UniFi controllers and exports them to monitoring systems including Prometheus, InfluxDB, Loki, and Datadog. This deployment integrates with the homelab's Prometheus and Grafana infrastructure.

## Configuration

### UniFi Controller Credentials

The UniFi controller credentials are stored in 1Password and referenced via the `unpoller-secrets` OnePasswordItem:

- **Vault**: Secrets
- **Item**: unpoller-secrets
- **Fields**:
  - `unifi-user`: UniFi controller username
  - `unifi-pass`: UniFi controller password

### Configuration Method

This deployment uses environment variables for configuration, following the [UnPoller configuration documentation](https://unpoller.com/docs/install/configuration). Sensitive credentials are stored in 1Password and injected via `valueFrom.secretKeyRef`, while all other settings are configured via environment variables in the HelmRelease.

### Metrics Collection

UnPoller exposes metrics on port 9130 and integrates with:

- **Prometheus**: Metrics scraping via ServiceMonitor
- **Grafana**: Pre-built dashboards for UniFi monitoring
- **Loki**: Events, alarms, anomalies, and IDS data export

## Documentation

- [UnPoller Configuration](https://unpoller.com/docs/install/configuration)
- [UnPoller Kubernetes Installation](https://unpoller.com/docs/install/kubernetes/)
- [UnPoller Grafana Dashboards](https://grafana.com/grafana/dashboards/?search=unpoller)
