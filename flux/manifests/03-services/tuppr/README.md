# Tuppr: Talos Linux upgrade controller

Kubernetes controller for managing automated upgrades of Talos Linux and Kubernetes.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

Tuppr provides automated upgrade orchestration:

- Talos node-by-node upgrades with health checks
- Automated Kubernetes version upgrades
- Safe execution: upgrades run from healthy nodes, never self-upgrade
- CEL-based health validation expressions
- Prometheus metrics for upgrade progress

## Configuration notes

### cert-manager integration

The tuppr Helm chart creates a self-signed certificate for its admission webhook. However, the chart's Certificate template is missing the `group` field in the `issuerRef`, which prevents cert-manager from properly issuing the certificate.

This deployment includes a Flux postRenderer that patches the Certificate resource to add the required `group: cert-manager.io` field. The patch is applied automatically during Helm rendering and ensures the certificate is issued correctly.

## Prerequisites

### Talos API access configuration

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

If you've regenerated your Talos configurations from the unified patch, the API access is already configured. If not, regenerate and apply your Talos configs:

```bash
# Regenerate configs with the updated patch
talosctl gen config ...

# Apply to all nodes
talosctl apply-config --file controlplane.yaml
talosctl apply-config --file worker.yaml
```

## Usage

### Version management

This deployment includes `TalosUpgrade` and `KubernetesUpgrade` resources that pin the current cluster versions. These resources serve dual purposes:

1. Version pinning: the current versions are the baseline, preventing unintended upgrades
2. Upgrade trigger: update the version in the respective resource

The resources are managed by GitOps through Flux and include health checks for safe upgrades:

- Node readiness validation
- CoreDNS availability checks
- Cilium health validation (Talos upgrades only)

### Talos node upgrades

The `TalosUpgrade` resource is defined in `talosupgrade.yaml`.

To upgrade Talos:

1. Update the `spec.talos.version` field in `talosupgrade.yaml`
2. Update the `spec.talosctl.image.tag` to match
3. Commit and push the changes
4. Monitor the upgrade: `kubectl get talosupgrade cluster -w`

### Kubernetes upgrades

The `KubernetesUpgrade` resource is defined in `kubernetesupgrade.yaml`.

To upgrade Kubernetes:

1. Update the `spec.kubernetes.version` field in `kubernetesupgrade.yaml`
2. Commit and push the changes
3. Monitor the upgrade: `kubectl get kubernetesupgrade kubernetes -w`

## Operations

### Monitoring upgrades

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
kubectl port-forward -n system-upgrade deployment/tuppr 8081:8081
curl http://localhost:8081/metrics | grep tuppr_
```

### Suspending upgrades

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

## References

- **[Tuppr Documentation](https://github.com/home-operations/tuppr)** - Official documentation
- **[Talos Upgrades](https://www.talos.dev/talos-guides/upgrading-talos/)** - Talos upgrade process
- [CEL Expression Language](https://cel.dev/)

## Monitoring

Tuppr exposes Prometheus metrics:

- Upgrade phase (Pending, InProgress, Completed, Failed)
- Node progress: total, completed, and failed counts
- Health check duration and failure rates
- Job execution: active jobs and completion times

### Example queries

```promql
# Upgrade phase status
tuppr_talos_upgrade_phase or tuppr_kubernetes_upgrade_phase

# Node upgrade progress
tuppr_talos_upgrade_nodes_completed / tuppr_talos_upgrade_nodes_total * 100

# Health check duration
histogram_quantile(0.95, rate(tuppr_health_check_duration_seconds_bucket[5m]))
```

## Important constraints

- Only one `TalosUpgrade` resource per cluster
- Only one `KubernetesUpgrade` resource per cluster
- Talos and Kubernetes upgrades cannot run simultaneously
- Upgrades are processed one at a time
