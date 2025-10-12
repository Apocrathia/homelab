# Tuppr - Talos Linux Upgrade Controller

This directory contains the deployment configuration for Tuppr, a Kubernetes controller for managing automated upgrades of Talos Linux and Kubernetes.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

Tuppr provides automated upgrade orchestration for:

- **Talos Node Upgrades**: Intelligent node-by-node upgrades with health checks
- **Kubernetes Upgrades**: Automated Kubernetes version upgrades
- **Safe Execution**: Upgrades run from healthy nodes, never self-upgrade
- **Health Validation**: CEL-based expressions for custom cluster validation
- **Comprehensive Metrics**: Prometheus integration for monitoring upgrade progress

## Configuration Notes

### Cert-Manager Integration

The tuppr Helm chart creates a self-signed certificate for its admission webhook. However, the chart's Certificate template is missing the `group` field in the `issuerRef`, which prevents cert-manager from properly issuing the certificate.

This deployment includes a Flux postRenderer that patches the Certificate resource to add the required `group: cert-manager.io` field. The patch is applied automatically during Helm rendering and ensures the certificate is issued correctly.

## Prerequisites

### Talos API Access Configuration

Tuppr requires Talos API access from the `system-upgrade` namespace. This configuration is already included in the unified Talos patch (`talos/patches/unified-patch.yaml`):

```yaml
machine:
  features:
    kubernetesTalosAPIAccess:
      allowedKubernetesNamespaces:
        - system-upgrade
      allowedRoles:
        - os:admin
      enabled: true
```

If you've regenerated your Talos configurations after this patch was added, the API access is already configured. If not, regenerate and apply your Talos configs:

```bash
# Regenerate configs with the updated patch
talosctl gen config ...

# Apply to all nodes
talosctl apply-config --file controlplane.yaml
talosctl apply-config --file worker.yaml
```

## Usage

### Talos Node Upgrades

Create a `TalosUpgrade` resource (only one allowed per cluster):

```yaml
apiVersion: tuppr.home-operations.com/v1alpha1
kind: TalosUpgrade
metadata:
  name: cluster
spec:
  talos:
    # renovate: datasource=docker depName=ghcr.io/siderolabs/installer
    version: v1.11.0

  policy:
    debug: false
    force: false
    rebootMode: default
    placement: soft

  healthChecks:
    - apiVersion: v1
      kind: Node
      expr: status.conditions.exists(c, c.type == "Ready" && c.status == "True")
```

### Kubernetes Upgrades

Create a `KubernetesUpgrade` resource (only one allowed per cluster):

```yaml
apiVersion: tuppr.home-operations.com/v1alpha1
kind: KubernetesUpgrade
metadata:
  name: kubernetes
spec:
  kubernetes:
    # renovate: datasource=docker depName=ghcr.io/siderolabs/kubelet
    version: v1.34.0

  healthChecks:
    - apiVersion: v1
      kind: Node
      expr: status.conditions.exists(c, c.type == "Ready" && c.status == "True")
      timeout: 10m
```

## Operations

### Monitoring Upgrades

```bash
# Watch upgrade progress
kubectl get talosupgrade -w
kubectl get kubernetesupgrade -w

# Check detailed status
kubectl describe talosupgrade cluster
kubectl describe kubernetesupgrade kubernetes

# View controller logs
kubectl logs -f deployment/tuppr -n system-upgrade

# Check metrics
kubectl port-forward -n system-upgrade deployment/tuppr 8080:8080
curl http://localhost:8080/metrics | grep tuppr_
```

### Suspending Upgrades

```bash
# Suspend Talos upgrade
kubectl annotate talosupgrade cluster tuppr.home-operations.com/suspend="true"

# Suspend Kubernetes upgrade
kubectl annotate kubernetesupgrade kubernetes tuppr.home-operations.com/suspend="true"

# Resume upgrades
kubectl annotate talosupgrade cluster tuppr.home-operations.com/suspend-
kubectl annotate kubernetesupgrade kubernetes tuppr.home-operations.com/suspend-
```

### Troubleshooting

```bash
# Reset failed upgrade
kubectl annotate talosupgrade cluster tuppr.home-operations.com/reset="$(date)"
kubectl annotate kubernetesupgrade kubernetes tuppr.home-operations.com/reset="$(date)"

# Check job logs
kubectl logs job/tuppr-<job-name> -n system-upgrade

# Emergency pause (scale down controller)
kubectl scale deployment tuppr --replicas=0 -n system-upgrade

# Resume operations
kubectl scale deployment tuppr --replicas=1 -n system-upgrade
```

## Monitoring

Tuppr provides comprehensive Prometheus metrics:

- **Upgrade Phase**: Current phase of upgrades (Pending, InProgress, Completed, Failed)
- **Node Progress**: Counts of total, completed, and failed nodes
- **Health Checks**: Duration and failure rates
- **Job Execution**: Active jobs and completion times

### Example Queries

```promql
# Upgrade phase status
tuppr_talos_upgrade_phase or tuppr_kubernetes_upgrade_phase

# Node upgrade progress
tuppr_talos_upgrade_nodes_completed / tuppr_talos_upgrade_nodes_total * 100

# Health check duration
histogram_quantile(0.95, rate(tuppr_health_check_duration_seconds_bucket[5m]))
```

## Important Constraints

- **Single TalosUpgrade**: Only one `TalosUpgrade` resource allowed per cluster
- **Single KubernetesUpgrade**: Only one `KubernetesUpgrade` resource allowed per cluster
- **No Concurrent Execution**: Talos and Kubernetes upgrades cannot run simultaneously
- **Sequential Processing**: Upgrades are processed one at a time

## Resources

- [Tuppr GitHub Repository](https://github.com/home-operations/tuppr)
- [Tuppr Documentation](https://github.com/home-operations/tuppr/blob/main/README.md)
- [CEL Expression Language](https://cel.dev/)
