# Housekeeping - Cluster Maintenance Automation

Automated maintenance tasks for cluster health and organization.

> **Navigation**: [← Back to Services README](../README.md)

## Documentation

- **[Kubernetes Node Management](https://kubernetes.io/docs/concepts/architecture/nodes/)** - Node administration
- **[CronJob Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)** - Scheduled jobs

## Overview

The housekeeping deployment provides automated node labeling and cluster organization.

> **Resource Cleanup**: Automated resource cleanup is handled by [Kyverno cleanup policies](../kyverno/README.md#cleanup-policies).

## Components

### Node Labels (`node-labels.yaml`)

- **Control Plane Labeling**: Labels specific nodes as control-plane nodes
- **Scheduled Updates**: Runs every 2 hours to ensure labels are consistent
- **Hardcoded Configuration**: Labels nodes `talos-01` through `talos-04` as control-plane
- **Overwrite Protection**: Uses `--overwrite` to ensure labels are applied correctly

## Troubleshooting

### Node Labeling Issues

```bash
# Check node labels
kubectl get nodes --show-labels

# Check labeling job logs
kubectl logs -n kube-system job/node-labeler
```

### Health Checks

```bash
# Check cronjob status
kubectl get cronjobs -n kube-system node-labeler

# Check recent jobs
kubectl get jobs -n kube-system -l job-name=node-labeler

# Verify node labels
kubectl get nodes -o custom-columns=NAME:.metadata.name,LABELS:.metadata.labels
```

## Resource Requirements

Resource requirements are configured in the CronJob manifests.
