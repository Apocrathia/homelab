# Grafana Alloy: log collection

The shared Alloy log collector: pod logs, OTLP traces, and external syslog/CEF ingestion.

> **Navigation**: [← Back to Observability README](../../README.md)

## Architecture

Alloy is deployed as a DaemonSet:

- Alloy: OpenTelemetry Collector-based log collection agent
- Kubernetes log source: collects logs from all pods
- Syslog receiver: RFC3164/5424 from network devices
- CEF receiver: CEF-formatted logs from UniFi devices
- Loki exporter: sends logs to Loki for storage and querying

## Log Collection

### Kubernetes Pod Logs

Alloy automatically collects logs from all pods in the cluster:

- Source: container logs from all namespaces
- Format: JSON with Kubernetes metadata
- Destination: Loki endpoint at `loki-write.loki-system.svc:3100`
- Labels: namespace, pod, container, cluster, component

### External Syslog Ingestion

Alloy accepts syslog from external devices via a shared LoadBalancer IP:

| Protocol | Port | Format       | Use Case                 |
| -------- | ---- | ------------ | ------------------------ |
| UDP      | 514  | RFC3164      | Standard syslog devices  |
| TCP      | 6514 | RFC3164/5424 | Reliable syslog delivery |
| TCP      | 1514 | CEF          | UniFi device logs        |

- **External IP**: `10.100.1.96` (`ingest.services.apocrathia.com`)
- **Labels**: job=syslog, component=syslog/cef, transport=tcp/udp

## Features

- Collects logs from all pods automatically
- Adds namespace, pod, container, and service labels
- Parses and formats log timestamps
- Native k8s attributes and resource detection
- Non-root execution with security contexts

## Configuration

### Log Processing Pipeline

1. Filelog receiver scrapes log files from all pods
2. Regex parser extracts timestamps from log entries
3. Timestamp processor converts to proper time format
4. K8s attributes processor adds Kubernetes metadata
5. Resource processor maps k8s attributes to log labels
6. Batch processor batches logs for transmission
7. Loki exporter sends to Loki with labels

### Log Labels

Each log entry includes:

- `namespace`: Kubernetes namespace
- `pod`: Pod name
- `container`: Container name
- `service`: Service name (if available)
- `time`: Parsed timestamp

## Access

- **Logs**: Available in Loki via Grafana
- **Metrics**: Alloy internal metrics (if enabled)
- **Configuration**: Managed via Helm values

## Integration

### With Loki

- Automatically configured to send logs to Loki
- Uses internal service endpoint for cluster communication
- JSON format with proper label mapping

### With existing monitoring

- Matches the cluster's namespace and labeling conventions
- Feeds the existing Prometheus stack
- Reuses the cluster's security patterns

## Security

- Non-root execution as user 10001
- Read-only filesystem
- Minimal RBAC for log collection
- Pod and container security contexts

## Monitoring

Alloy components can be monitored via:

- Pod health and readiness
- Resource usage metrics
- Log collection statistics

## Troubleshooting

### Check Alloy status

```bash
kubectl get pods -n alloy-system
kubectl logs -n alloy-system -l app.kubernetes.io/name=alloy
```

### Verify log collection

```bash
# Check if logs are reaching Loki
kubectl exec -n loki-system deployment/loki -- logcli query '{namespace="kube-system"}' --limit=5
```

### Configuration issues

```bash
# Check Alloy configuration
kubectl get configmap -n alloy-system
kubectl describe configmap -n alloy-system alloy-config
```

## References

- **[Grafana Alloy Documentation](https://grafana.com/docs/alloy/)** - Primary documentation source
- **[OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)** - OTel Collector docs
- [Loki LogQL](https://grafana.com/docs/loki/next/logql/)
