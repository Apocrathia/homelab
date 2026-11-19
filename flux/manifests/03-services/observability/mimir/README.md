# Mimir - Long-term Metrics Storage

This directory contains the deployment configuration for Grafana Mimir, which provides long-term storage for Prometheus metrics.

> **Navigation**: [← Back to Observability README](../README.md)

## Architecture

Mimir is deployed in distributed mode with the following components:

- **Ingester**: Receives and stores metrics
- **Distributor**: Routes incoming metrics to ingesters
- **Querier**: Handles queries against stored metrics
- **Store Gateway**: Provides access to long-term storage
- **Compactor**: Compacts and deduplicates metrics
- **External RustFS**: Object storage backend for metrics data

## Storage Configuration

Mimir uses external RustFS for object storage with separate buckets for
different data types (create all three in RustFS before first deploy):

- `mimir-blocks`: Time series data blocks
- `mimir-ruler`: Recording rules and alerting rules
- `mimir-alertmanager`: Alertmanager configuration

## 1Password Setup

Before deploying Mimir, create the RustFS credentials in 1Password:

1. In your 1Password vault, create a new item called `mimir-secrets`
2. Add these fields:
   - **Field Label**: `access-key-id` | **Value**: `your-rustfs-access-key`
   - **Field Label**: `access-key-secret` | **Value**: `your-rustfs-secret-key`
3. The 1Password Connect Operator materializes the Kubernetes secret; Flux injects the values into the HelmRelease via `valuesFrom`

## Integration with Prometheus

Prometheus is configured to remote write all metrics to Mimir via the gateway at:
`http://mimir-gateway.mimir-system.svc:80/api/v1/push`

## Access

- **Metrics API**: `http://mimir-gateway.mimir-system.svc:80/prometheus/`
- **External RustFS**: `http://storage.services.apocrathia.com:9009`

## Security Notes

- RustFS credentials live in the `mimir-secrets` 1Password item (fields above); nothing sensitive is stored in git
- External RustFS endpoint is configured as `storage.services.apocrathia.com:9009` (no protocol prefix)
- External RustFS is configured with `insecure: true` for HTTP communication
- Each storage backend uses separate buckets to avoid conflicts
- Usage stats are disabled to prevent S3 configuration issues
- Compactor has persistent storage for local data operations
- No sensitive values are stored in the Git repository

## Monitoring

Mimir components are monitored via ServiceMonitors and will appear in the existing Prometheus/Grafana stack.

## References

- **[Mimir Documentation](https://grafana.com/docs/mimir/)** - Primary documentation source
- **[GitHub Repository](https://github.com/grafana/mimir)** - Source code and issues
