# Housekeeping - Cluster Maintenance Automation

Automated maintenance tasks for cluster health and organization.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

Housekeeping provides automated maintenance tasks via CronJobs.

> **Resource Cleanup**: Automated resource cleanup is handled by [Kyverno cleanup policies](../kyverno/README.md#cleanup-policies).

## Components

### etcd Defragmentation (`etcd-defrag/`)

Prevents etcd database bloat by periodically defragmenting when fragmentation exceeds threshold.

- **Schedule**: Weekly (Sunday 4 AM)
- **Namespace**: `housekeeping`
- **Threshold**: Defragments when fragmentation exceeds 50%
- **Talos API**: Uses `kubernetesTalosAPIAccess` feature

## Troubleshooting

### etcd Defrag Issues

```bash
# Check cronjob status
kubectl get cronjobs -n housekeeping etcd-defrag

# Run manually
kubectl create job etcd-defrag-manual --from=cronjob/etcd-defrag -n housekeeping

# Check logs
kubectl logs job/etcd-defrag-manual -n housekeeping

# Check etcd status directly
talosctl etcd status -n 10.100.1.80
```

## References

- **[Kubernetes CronJob Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)** - Scheduled jobs
- **[Talos etcd Management](https://www.talos.dev/v1.12/talos-guides/configuration/etcd-maintenance/)** - etcd operations

## Prerequisites

The `housekeeping` namespace requires Talos API access. This is configured in `talos/patches/unified-patch.yaml`:

```yaml
machine:
  features:
    kubernetesTalosAPIAccess:
      allowedKubernetesNamespaces:
        - system-upgrade
        - housekeeping
      allowedRoles:
        - os:admin
      enabled: true
```
