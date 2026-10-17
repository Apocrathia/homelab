# Management

Administrative tools and developer infrastructure.

> **Navigation**: [← Back to Apps README](../README.md)

## Applications

### [CDN](./cdn/README.md)

Self-hosted static file host for the homelab repo tree: every repo file served under one unauthenticated LAN/tailnet URL (replaces GitLab raw fetches on dashboard tiles).

### [Fleet](./fleet/README.md)

Open-source device management (osquery) for endpoint inventory, queries, and vulnerability visibility.

### [JetKVM](./jetkvm/README.md)

Self-hosted JetKVM Cloud API and Dashboard for KVM-over-IP device management.

### [kuber-ios](./kuber-ios/README.md)

Service account and External Secrets PushSecret for mobile Kubernetes clients (e.g. Kuber, Kubenav): cluster token synced to 1Password.

### [LibreSpeed](./speedtest/README.md)

Self-hosted HTML5 network speed test for LAN and tailnet throughput checks.

### [UnPoller](./unpoller/README.md)

UniFi network monitoring exporting metrics to Prometheus with Grafana dashboards.

### [Scripts](./scripts/README.md)

Scheduled jobs and helpers under `scripts/` (e.g. [UniFi](./scripts/unifi/README.md) automation).

## References

- **[Generic-App Chart](../../../helm/generic-app/README.md)** - Application deployment template
