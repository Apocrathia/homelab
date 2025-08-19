# Mimir - Long-term Metrics Storage

This directory contains the deployment configuration for Grafana Mimir, which provides long-term storage for Prometheus metrics.

## Architecture

Mimir is deployed in distributed mode with the following components:

- **Ingester**: Receives and stores metrics
- **Distributor**: Routes incoming metrics to ingesters
- **Querier**: Handles queries against stored metrics
- **Store Gateway**: Provides access to long-term storage
- **Compactor**: Compacts and deduplicates metrics
- **MinIO**: Object storage backend for metrics data

## Storage Configuration

Mimir uses MinIO (deployed as a subchart) for object storage with the following buckets:

- `mimir-tsdb`: Time series data blocks
- `mimir-ruler`: Recording rules and alerting rules
- `enterprise-metrics-admin`: Administrative data

## 1Password Setup

Before deploying Mimir, you need to create the MinIO credentials in 1Password:

1. In your 1Password vault, create a new item called `mimir-minio-credentials`
2. Add these fields:
   - **Field Label**: `root_user` | **Value**: `mimir-storage`
   - **Field Label**: `root_password` | **Value**: `your-secure-password-here`
3. The 1Password Connect Operator will automatically create a Kubernetes secret with these values
4. Flux will use `valuesFrom` to inject these values into the HelmRelease at deployment time

## Integration with Prometheus

Prometheus is configured to remote write all metrics to Mimir via the nginx gateway at:
`http://mimir-nginx.mimir-system.svc:80/api/v1/push`

## Access

- **Metrics API**: `http://mimir-nginx.mimir-system.svc:80/api/v1/query`
- **MinIO Console**: Available via port-forward to MinIO service on port 9001

## Security Notes

- MinIO credentials are stored in 1Password and referenced via 1Password Connect
- The `mimir-minio-credentials` item should be created in your 1Password vault with:
  - `root_user`: The MinIO root username (e.g., `mimir-storage`)
  - `root_password`: The MinIO root password
- Flux `valuesFrom` automatically injects these values into the HelmRelease at deployment time
- MinIO is configured with `insecure: true` for internal cluster communication
- All S3 storage configuration is handled automatically by the chart when MinIO is enabled
- No sensitive values are stored in the Git repository

## Resource Requirements

- **MinIO**: 100Gi storage, 100m-500m CPU, 128Mi-512Mi memory
- **Ingester**: 50Gi storage, 200m-1000m CPU, 512Mi-2Gi memory
- **Other components**: 100m-500m CPU, 256Mi-1Gi memory each

## Monitoring

Mimir components are monitored via ServiceMonitors and will appear in the existing Prometheus/Grafana stack.
