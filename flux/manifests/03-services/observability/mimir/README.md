# Mimir - Long-term Metrics Storage

This directory contains the deployment configuration for Grafana Mimir, which provides long-term storage for Prometheus metrics.

> **Navigation**: [← Back to Observability README](../README.md)

## Documentation

- **[Mimir Documentation](https://grafana.com/docs/mimir/)** - Primary documentation source
- **[GitHub Repository](https://github.com/grafana/mimir)** - Source code and issues

## Architecture

Mimir is deployed in distributed mode with the following components:

- **Ingester**: Receives and stores metrics
- **Distributor**: Routes incoming metrics to ingesters
- **Querier**: Handles queries against stored metrics
- **Store Gateway**: Provides access to long-term storage
- **Compactor**: Compacts and deduplicates metrics
- **External MinIO**: Object storage backend for metrics data

## Storage Configuration

Mimir uses external MinIO for object storage with separate buckets for different data types:

- `mimir-blocks`: Time series data blocks
- `mimir-ruler`: Recording rules and alerting rules
- `mimir-alertmanager`: Alertmanager configuration

## 1Password Setup

Before deploying Mimir, you need to create the MinIO credentials in 1Password:

1. In your 1Password vault, create a new item called `mimir-secrets`
2. Add these fields:
   - **Field Label**: `access-key-id` | **Value**: `your-minio-access-key`
   - **Field Label**: `access-key-secret` | **Value**: `your-minio-secret-key`
3. The 1Password Connect Operator will automatically create a Kubernetes secret with these values
4. Flux will use `valuesFrom` to inject these values into the HelmRelease at deployment time

## Integration with Prometheus

Prometheus is configured to remote write all metrics to Mimir via the gateway at:
`http://mimir-gateway.mimir-system.svc:80/api/v1/push`

## Access

- **Metrics API**: `http://mimir-gateway.mimir-system.svc:80/prometheus/`
- **External MinIO**: `http://storage.services.apocrathia.com:9000`

## Required Buckets

Before deploying Mimir, ensure these buckets exist in your MinIO server:

- `mimir-blocks`
- `mimir-ruler`
- `mimir-alertmanager`

## Security Notes

- MinIO credentials are stored in 1Password and referenced via 1Password Connect
- The `mimir-secrets` item should be created in your 1Password vault with:
  - `access-key-id`: The MinIO access key
  - `access-key-secret`: The MinIO secret key
- Flux `valuesFrom` automatically injects these values into the HelmRelease at deployment time
- External MinIO endpoint is configured as `storage.services.apocrathia.com:9000` (no protocol prefix)
- External MinIO is configured with `insecure: true` for HTTP communication
- Each storage backend uses separate buckets to avoid conflicts
- Usage stats are disabled to prevent S3 configuration issues
- Compactor has persistent storage for local data operations
- No sensitive values are stored in the Git repository

## Monitoring

Mimir components are monitored via ServiceMonitors and will appear in the existing Prometheus/Grafana stack.
