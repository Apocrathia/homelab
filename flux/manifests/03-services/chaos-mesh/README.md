# Chaos Mesh

Chaos Mesh is a cloud-native chaos engineering platform that orchestrates chaos experiments on Kubernetes environments.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

This installation deploys Chaos Mesh v2.7.2 with the following components:

- **Controller Manager**: Manages chaos experiments with leader election for HA
- **Chaos Daemon**: Executes chaos experiments on nodes
- **Dashboard**: Web UI for managing and monitoring chaos experiments
- **DNS Server**: Handles DNS-related chaos experiments

## Security & Namespace Configuration

Chaos Mesh is configured with **FilterNamespace** enabled, which means:

- Chaos experiments can only run in namespaces with the `chaos-mesh.org/inject=enabled` annotation
- This prevents accidental chaos injection into production namespaces

### Adding Chaos Experiments to Other Namespaces

To enable chaos experiments in any other namespace:

```bash
kubectl annotate namespace YOUR_NAMESPACE chaos-mesh.org/inject=enabled
```

**⚠️ Warning:** Only add this annotation to namespaces where you want to allow chaos experiments!

## Configuration

### Runtime Configuration

The installation is configured for **containerd** runtime, which is compatible with your Talos-based cluster:

```yaml
runtime: containerd
containerdRuntime: containerd
socketPath: /run/containerd/containerd.sock
```

### Chaos Types Enabled

The following chaos experiment types are enabled:

- **Pod Chaos**: pod-kill, pod-failure, container-kill
- **Network Chaos**: network-delay, network-loss, network-duplication
- **IO Chaos**: io-delay, io-error, io-attrOverride
- **Stress Chaos**: CPU/memory stress injection
- **Time Chaos**: time skew injection
- **DNS Chaos**: DNS resolution manipulation
- **HTTP Chaos**: HTTP request/response manipulation
- **JVM Chaos**: Java application chaos (if applicable)
- **Kernel Chaos**: Kernel fault injection
- **Filesystem Chaos**: Filesystem fault injection

### Security

- **Authentication Enabled**: Dashboard requires authentication
- **Admission Webhooks**: Enabled for experiment validation

### Monitoring

- **Prometheus Integration**: ServiceMonitor for metrics collection
- **Metrics**: Comprehensive metrics for experiments and components
- **Health Checks**: Pod health and readiness probes

## Accessing the Dashboard

The Chaos Mesh dashboard is exposed through Authentik authentication at: **https://chaos-mesh.gateway.services.apocrathia.com**

The HTTPRoute is automatically managed by Authentik's outpost based on the blueprint configuration.

### Alternative Access Methods

If you need direct access (e.g., for API calls), you can still port-forward:

```bash
kubectl port-forward -n chaos-mesh svc/chaos-mesh-dashboard 2333:2333
```

Then access at: http://localhost:2333

## Getting Started with Chaos Experiments

### 1. Verify Installation

```bash
# Check all Chaos Mesh pods are running
kubectl get pods -n chaos-mesh

# Verify chaos-daemon is running on all nodes
kubectl get daemonset chaos-daemon -n chaos-mesh
```

### 2. First Chaos Experiment

Create a simple pod-kill experiment in the chaos-test namespace:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-demo
  namespace: chaos-mesh
spec:
  action: pod-kill
  mode: one
  duration: 30s
  selector:
    namespaces:
      - chaos-test
    labelSelectors:
      app: demo-app
  scheduler:
    cron: "@every 1m"
```

Apply the experiment:

```bash
kubectl apply -f pod-kill-demo.yaml
```

### 3. Monitor Experiments

- **Dashboard**: Use the web UI at https://chaos-mesh.gateway.services.apocrathia.com
  - Requires authentication: Use Authentik SSO or admin token
- **CLI**: Check experiment status with `kubectl get podchaos -n chaos-mesh`
- **Logs**: View controller logs with `kubectl logs -n chaos-mesh deployment/chaos-controller-manager`

## Usage

### Creating Experiments

You can create chaos experiments through:

1. **Dashboard**: Web UI for creating and managing experiments
2. **YAML**: Direct Kubernetes manifests
3. **CLI**: chaosctl command-line tool

### Example Experiment

Here's an example pod-kill experiment:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-example
  namespace: chaos-mesh
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: my-app
  scheduler:
    cron: "@every 30s"
```

## Best Practices

1. **Start Small**: Begin with simple experiments in non-production namespaces
2. **Monitor Impact**: Always monitor system metrics during experiments
3. **Use Namespaces**: Isolate experiments to specific namespaces
4. **Schedule Wisely**: Use cron expressions for controlled experiment timing
5. **RBAC**: Implement proper access controls for chaos experiment management

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure chaos-daemon has proper privileges for containerd
2. **Socket Path**: Verify containerd socket path is correct for your setup
3. **Network Policies**: Check if network policies block chaos experiment traffic
4. **Resource Limits**: Monitor resource usage as chaos experiments can be resource-intensive

### Logs

Check component logs for troubleshooting:

```bash
# Controller manager logs
kubectl logs -n chaos-mesh deployment/chaos-controller-manager

# Chaos daemon logs
kubectl logs -n chaos-mesh daemonset/chaos-daemon

# Dashboard logs
kubectl logs -n chaos-mesh deployment/chaos-dashboard
```

## Integration

Chaos Mesh integrates with:

- **Authentik**: Single sign-on authentication through proxy provider and automatic HTTPRoute management
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Dashboards for chaos experiment monitoring
- **Kyverno**: Policy-based chaos experiment governance
- **Cert-Manager**: Certificate management for dashboard
- **Gateway API**: Automatic HTTPRoute management through Authentik outpost

## Documentation

For comprehensive documentation, visit:

- [Chaos Mesh Documentation](https://chaos-mesh.org/docs/)
- [GitHub Repository](https://github.com/chaos-mesh/chaos-mesh)

## Security Considerations

- Dashboard authentication is enabled for production security
- Regular security audits of chaos experiments
- Network policies to restrict chaos experiment scope
