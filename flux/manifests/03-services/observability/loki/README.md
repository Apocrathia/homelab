# Loki - Log Aggregation

This directory contains the deployment configuration for Grafana Loki, which provides log aggregation and querying capabilities for the cluster.

## Architecture

Loki is deployed in monolithic mode with the following components:

- **Loki**: Core log aggregation and storage service
- **MinIO**: Object storage backend for log data
- **Grafana Agent Operator**: Manages log collection agents
- **Rollout Operator**: Handles deployment rollouts

## Storage Configuration

Loki uses MinIO (deployed as a subchart) for object storage with the following configuration:

- **Storage Type**: Object storage with MinIO backend
- **Retention**: 31 days (744 hours)
- **Storage Size**: 100Gi allocated
- **Storage Class**: Longhorn (consistent with your cluster)
- **Buckets**: `loki-data` (created automatically)

## 1Password Setup

Before deploying Loki, you need to create the MinIO credentials in 1Password:

1. In your 1Password vault, create a new item called `loki-minio-credentials`
2. Add these fields:
   - **Field Label**: `access_key_id` | **Value**: `loki-storage` (or your preferred username)
   - **Field Label**: `secret_access_key` | **Value**: `your-secure-password-here`
3. The 1Password Connect Operator will automatically create a Kubernetes secret with these values
4. Flux will use `secretRef` to inject these values into the HelmRelease at deployment time

## Features

- **Log Collection**: Automatic collection of container logs via Grafana Agent Operator
- **Query Interface**: LogQL query language support
- **Retention Management**: Automatic log cleanup after 31 days
- **Monitoring**: Integrated with Prometheus stack via ServiceMonitor
- **Security**: Non-root execution, proper security contexts

## Access

- **Logs API**: `http://loki.loki-system.svc:3100`
- **Grafana Integration**: Automatically configured as "Loki" datasource
- **MinIO Console**: Available via port-forward to MinIO service on port 9001

## Integration

### With Prometheus Stack

- ServiceMonitor automatically created for Loki metrics
- Metrics available in Grafana dashboards
- Alerts can be configured for Loki health

### With Grafana

- Add Loki as a data source in Grafana
- URL: `http://loki.loki-system.svc:3100`
- No authentication required (auth_enabled: false)

### With Existing Monitoring

- Automatically configured in Grafana as "Loki" datasource
- Integrates with your Prometheus stack
- Follows your existing namespace and labeling conventions

## Resource Requirements

- **Loki**: 200m-1000m CPU, 512Mi-2Gi memory
- **MinIO**: 100m-500m CPU, 256Mi-1Gi memory
- **Grafana Agent Operator**: 100m-200m CPU, 128Mi-256Mi memory
- **Rollout Operator**: 50m-100m CPU, 64Mi-128Mi memory

## Log Collection

The Grafana Agent Operator will automatically:

- Discover pods and services
- Collect container logs
- Forward logs to Loki
- Handle log rotation and buffering

## Configuration

### Log Retention

- Default retention: 31 days
- Configurable via `loki.table_manager.retention_period`
- Automatic cleanup enabled

### Storage

- MinIO backend with 100Gi allocation
- Filesystem storage for chunks and rules
- Longhorn storage class for persistence

### Security

- Non-root execution
- Proper security contexts
- Cluster-internal access only (ClusterIP service)

## Troubleshooting

### Check Loki Status

```bash
kubectl get pods -n loki-system
kubectl logs -n loki-system deployment/loki
```

### Check MinIO Status

```bash
kubectl get pods -n loki-system -l app.kubernetes.io/name=minio
kubectl port-forward -n loki-system svc/loki-minio 9001:9001
```

### Access Logs

```bash
# Query logs via kubectl
kubectl exec -n loki-system deployment/loki -- logcli query '{job="kubelet"}'

# Port forward to access Loki API
kubectl port-forward -n loki-system svc/loki 3100:3100
```

## External Log Ingestion

For external log sources (syslog, filebeat, etc.), you can:

1. **Direct API**: Send logs to `http://loki.loki-system.svc:3100/loki/api/v1/push`
2. **TCP/UDP Routes**: Create separate Gateway API routes for non-HTTP protocols
3. **Log Agents**: Use Grafana Agent, Fluentd, or other agents to forward logs

## Security Notes

- MinIO credentials are stored in 1Password and referenced via 1Password Connect
- The `loki-minio-credentials` item should be created in your 1Password vault with:
  - `access_key_id`: The MinIO access key (e.g., `loki-storage`)
  - `secret_access_key`: The MinIO secret access key
- Flux `secretRef` automatically injects these values into the HelmRelease at deployment time
- MinIO is configured with `insecure: true` for internal cluster communication
- All S3 storage configuration is handled automatically by the chart when MinIO is enabled
- No sensitive values are stored in the Git repository

## Next Steps

1. **Loki is automatically configured in Grafana** as a datasource
2. **Create Dashboards**: Build dashboards for log analysis and monitoring
3. **Configure Alerts**: Set up alerts for log volume, errors, and system health
4. **Custom Log Parsing**: Configure log parsing rules for specific applications
5. **Log Retention Policies**: Adjust retention based on your compliance needs
6. **External Sources**: Set up log forwarding from external systems

## References

- [Loki Helm Chart Documentation](https://grafana.com/docs/loki/next/installation/helm/)
- [LogQL Query Language](https://grafana.com/docs/loki/next/logql/)
- [Grafana Agent Operator](https://grafana.com/docs/agent/latest/static/flow/reference/components/grafana.agent.operator/)
