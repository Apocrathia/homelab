# Kube Prometheus Stack

Prometheus, Grafana, and Alertmanager monitoring for Kubernetes.

> **Navigation**: [← Back to Infrastructure README](../README.md)

## Overview

The kube-prometheus-stack provides:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert management and routing
- **Node Exporter**: Node-level metrics collection
- **Kube State Metrics**: Kubernetes object state metrics
- **Prometheus Operator**: Declarative configuration management

## Architecture

### Core components

**Prometheus** scrapes metrics from Kubernetes components, stores them as
time series, queries them with PromQL, and evaluates alert rules.

**Grafana** serves pre-built and custom dashboards over multiple data
sources, with alerting integrated against Prometheus and its own
authentication and user management.

**Alertmanager** routes and groups alerts to notification channels,
silences them when asked, and runs clustered for high availability.

### Supporting components

**Node Exporter** collects node CPU, memory, disk, and network metrics.

**Kube State Metrics** exports state metrics for Kubernetes objects: pods,
nodes, deployments, overall cluster health.

**Prometheus Operator** manages the Prometheus components through CRDs:
declarative configuration and automated deployment and scaling.

## 1Password Setup

Before deploying, create the local account credentials in 1Password:

1. In your 1Password vault, create a new item called `local-account`
2. Add these fields:
   - **Field Label**: `username` | **Value**: `admin`
   - **Field Label**: `password` | **Value**: `your-secure-password`

The 1Password Connect Operator will automatically create a Kubernetes secret with these values for Grafana admin access.

## Features

### Monitoring

- Node, pod, service, application, network, and storage metrics

### Alerting

- Rule-based alerts with grouping, routing, and silencing
- Notifications through email, Slack, PagerDuty, etc.

### Visualization

- Pre-built Kubernetes, node, and application dashboards
- Custom dashboards and ad-hoc PromQL exploration
- Live-updating panels

## Access and Usage

### Grafana access

- Internal URL: `http://grafana.prometheus-system.svc:80`
- External access via Gateway API with Authentik authentication
- Admin credentials in the 1Password `local-account` item

### Prometheus access

- Internal URL: `http://prometheus-k8s.prometheus-system.svc:9090`
- REST query API and configurable alert rules

### Alertmanager access

- Internal URL: `http://alertmanager-operated.prometheus-system.svc:9093`
- View active and resolved alerts; manage silences

## Configuration

### Resource Requirements

Resource limits and requests are configured in `helmrelease.yaml`.

### Storage

- Prometheus metrics and Grafana data each sit on persistent volumes
- Metrics retention is configurable

### Security

- RBAC and network policies restrict access
- TLS between components; Authentik provides SSO

## Integration with Homelab

### Authentik Integration

- Single sign-on for Grafana access via the proxy provider
- Ownership: the `crossplane.yaml` + `authentik.tf` file pair in this directory owns the app's whole Authentik stack (proxy provider, application, admins binding, outpost) through a provider-opentofu Workspace stitched at kustomize build time; the retired blueprint's objects, adopted in place
- `skip_path_regex` keeps `/api/`, `/mcp`, and `/sse` unauthenticated (the MCP server needs bearer access)
- Authentication and access logging

### Longhorn

- Longhorn dashboards, backup job monitoring, and storage performance metrics

### Cilium

- Network policy monitoring, security events, and network performance dashboards

### Applications

- ServiceMonitors and PodMonitors for automatic discovery and pod-level collection
- Application-specific metrics and alerts

## Dashboards and Alerts

### Pre-configured dashboards

- Kubernetes cluster: node and pod overview, resource usage and limits
- Component health: Prometheus, Grafana, Alertmanager, Node Exporter
- Longhorn: storage system monitoring

### Alert rules

- Node down, pod CrashLoopBackOff
- High CPU and memory usage
- Disk space and I/O issues, network connectivity problems

## Security Considerations

### Access control

- Grafana authentication is SSO through Authentik
- Prometheus sits behind network policies and RBAC
- Alertmanager access is restricted to administrators; APIs use TLS and authentication

### Data protection

- Metrics encrypted in transit
- Access logging for audit trails
- Configuration backups; security and compliance monitoring

## Troubleshooting

### Common Issues

1. **Metrics Collection Failures**

   ```bash
   # Check Prometheus targets
   kubectl port-forward -n prometheus-system svc/prometheus-k8s 9090:9090

   # Check target health
   curl http://localhost:9090/api/v1/targets | jq .
   ```

2. **Grafana Access Issues**

   ```bash
   # Check Grafana pods
   kubectl get pods -n prometheus-system

   # Check Grafana logs
   kubectl logs -n prometheus-system deployment/grafana
   ```

3. **Alertmanager Issues**

   ```bash
   # Check alertmanager status
   kubectl get pods -n prometheus-system -l app.kubernetes.io/name=alertmanager

   # Check alert routing
   kubectl port-forward -n prometheus-system svc/alertmanager-operated 9093:9093
   ```

### Health Checks

```bash
# Check all components
kubectl get pods -n prometheus-system

# Check Prometheus health
kubectl port-forward -n prometheus-system svc/prometheus-k8s 9090:9090
curl http://localhost:9090/-/healthy

# Check Grafana health
kubectl port-forward -n prometheus-system svc/grafana 3000:80
curl http://localhost:3000/api/health
```

### Log Analysis

```bash
# Prometheus logs
kubectl logs -n prometheus-system statefulset/prometheus-k8s

# Grafana logs
kubectl logs -n prometheus-system deployment/grafana

# Alertmanager logs
kubectl logs -n prometheus-system -l app.kubernetes.io/name=alertmanager
```

## References

- **[Kube Prometheus Stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)** - Helm chart documentation
- **[Prometheus](https://prometheus.io/docs/)** - Prometheus documentation
- **[Grafana](https://grafana.com/docs/)** - Grafana documentation

## Best Practices

### Configuration

1. Pin Helm chart versions
2. Back up Grafana dashboards regularly
3. Fine-tune alert thresholds
4. Organize dashboards by namespace

### Operations

1. Watch the monitoring stack's own resource usage
2. Set retention periods deliberately
3. Review and clean up alerts regularly
4. Optimize slow Prometheus queries

### Security

1. Least-privilege access
2. Network policies and encryption
3. Monitor the monitoring stack itself
4. Apply security updates
