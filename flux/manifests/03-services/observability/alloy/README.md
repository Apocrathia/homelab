# Grafana Alloy - Log Collection

This directory contains the deployment configuration for Grafana Alloy, which provides log collection capabilities for the cluster using OpenTelemetry Collector patterns.

> **Navigation**: [← Back to Observability README](../README.md)

## Documentation

- **[Grafana Alloy Documentation](https://grafana.com/docs/alloy/)** - Primary documentation source
- **[OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)** - OTel Collector docs

## Architecture

Alloy is deployed as a DaemonSet with the following components:

- **Alloy**: OpenTelemetry Collector-based log collection agent
- **Filelog Receiver**: Scrapes container logs from `/var/log/pods/*/*/*.log`
- **K8s Attributes Processor**: Adds Kubernetes metadata to logs
- **Loki Exporter**: Sends logs to Loki for storage and querying

## Log Collection

Alloy automatically collects logs from all pods in the cluster:

- **Source**: Container logs from all namespaces
- **Format**: JSON with Kubernetes metadata
- **Destination**: Loki endpoint at `loki.loki-system.svc:3100`
- **Coverage**: All pods, including control plane components

## Features

- **Automatic Discovery**: Collects logs from all pods automatically
- **Rich Metadata**: Adds namespace, pod, container, and service labels
- **Timestamp Parsing**: Proper log timestamp extraction and formatting
- **Kubernetes Integration**: Native k8s attributes and resource detection
- **Security**: Non-root execution with proper security contexts

## Configuration

### Log Processing Pipeline

1. **Filelog Receiver**: Scrapes log files from all pods
2. **Regex Parser**: Extracts timestamps from log entries
3. **Timestamp Processor**: Converts to proper time format
4. **K8s Attributes**: Adds Kubernetes metadata
5. **Resource Processor**: Maps k8s attributes to log labels
6. **Batch Processor**: Batches logs for efficient transmission
7. **Loki Exporter**: Sends to Loki with proper labeling

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

### With Existing Monitoring

- Follows your existing namespace and labeling conventions
- Integrates with your Prometheus stack
- Uses your existing security patterns

## Resource Requirements

- **CPU**: 100m-500m per node
- **Memory**: 128Mi-512Mi per node
- **Storage**: Minimal (logs are streamed, not stored)

## Security

- **Non-root execution**: Runs as user 10001
- **Read-only filesystem**: Secure container configuration
- **RBAC**: Minimal permissions for log collection
- **Security contexts**: Proper pod and container security

## Monitoring

Alloy components can be monitored via:

- Pod health and readiness
- Resource usage metrics
- Log collection statistics

## Troubleshooting

### Check Alloy Status

```bash
kubectl get pods -n alloy-system
kubectl logs -n alloy-system -l app.kubernetes.io/name=alloy
```

### Verify Log Collection

```bash
# Check if logs are reaching Loki
kubectl exec -n loki-system deployment/loki -- logcli query '{namespace="kube-system"}' --limit=5
```

### Configuration Issues

```bash
# Check Alloy configuration
kubectl get configmap -n alloy-system
kubectl describe configmap -n alloy-system alloy-config
```

## Next Steps

1. **Deploy Alloy**: The Helm chart will handle deployment
2. **Verify Log Collection**: Check that logs are flowing to Loki
3. **Create Dashboards**: Build Grafana dashboards for log analysis
4. **Configure Alerts**: Set up alerts for log volume and errors
5. **Customize Collection**: Adjust log collection patterns if needed

## References

- [Grafana Alloy Documentation](https://grafana.com/docs/alloy/latest/)
- [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)
- [Loki LogQL](https://grafana.com/docs/loki/next/logql/)
