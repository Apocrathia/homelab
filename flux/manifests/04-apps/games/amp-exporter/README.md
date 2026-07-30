# AMP Exporter

Prometheus exporter for [CubeCoders AMP](https://cubecoders.com/AMP) game
server instances, scraped into the homelab observability stack.

> **Navigation**: [← Back to Games README](../README.md)

## Overview

[amp-cubecoders-exporter](https://github.com/soynx/amp-cubecoders-exporter)
polls the AMP JSON API (ADS controller at `game.apocrathia.com`) and exposes
instance CPU, memory, disk, player counts, app state, and module-specific
metrics (for example Minecraft TPS) on `:9822/metrics`.

## Configuration

### AMP credentials

Credentials are stored in 1Password and synced via OnePasswordItem
`amp-exporter-secrets`:

- **Vault**: Secrets
- **Item**: amp-exporter-secrets
- **Fields**:
  - `username`: AMP monitoring user (read-only role, no 2FA)
  - `credential`: Password for that user

Create a dedicated AMP role with instance visibility only (no management
permissions), then assign a user to it. See the exporter
[security notes](https://github.com/soynx/amp-cubecoders-exporter#setting-up-the-amp-user).

### Panel URL

`AMP_URL` is set to `http://game.apocrathia.com:8080/` in the HelmRelease.

## Metrics and dashboards

- **Prometheus**: ServiceMonitor scrapes `/metrics` every 30s
- **Grafana**: `CubeCoders AMP` dashboard in folder **Games** (upstream JSON from the exporter release)

## Troubleshooting

```bash
kubectl get pods -n amp-exporter
kubectl logs -n amp-exporter deployment/amp-exporter -f
kubectl get servicemonitor -n amp-exporter
kubectl port-forward -n amp-exporter deployment/amp-exporter 9822:9822
curl -s localhost:9822/metrics | head
curl -s localhost:9822/healthz
```

Failed AMP logins show as `amp_up 0` and WARN lines in the exporter logs.
Repeated bad passwords can trip AMP brute-force protection — stop the pod,
fix credentials, wait a few minutes, then restart.

## References

- **[amp-cubecoders-exporter](https://github.com/soynx/amp-cubecoders-exporter)** - Exporter source and dashboard
- **[CubeCoders AMP](https://cubecoders.com/AMP)** - Game server control panel
