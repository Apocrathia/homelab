# Longhorn

Distributed block storage for Kubernetes with replication, snapshots, and backup.

> **Navigation**: [← Back to Infrastructure README](../README.md)

## Overview

Longhorn provides persistent storage with:

- Replicated block storage across cluster nodes
- Automated backup to MinIO (S3-compatible)
- Point-in-time snapshots
- Dynamic provisioning and online expansion

## Access

- **Web UI**: `https://longhorn.gateway.services.apocrathia.com`
- **Authentication**: Authentik SSO

## Configuration

See `helmrelease.yaml` for storage settings including replica count, data locality, and retention policies.

### 1Password Setup

Create `longhorn-backup-target-secret` in your vault with:

| Field                   | Value                                |
| ----------------------- | ------------------------------------ |
| `AWS_ACCESS_KEY_ID`     | MinIO access key                     |
| `AWS_SECRET_ACCESS_KEY` | MinIO secret key                     |
| `AWS_ENDPOINTS`         | `http://minio.minio-system.svc:9000` |

## Storage Class

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: example-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 10Gi
```

## Backup

- **Target**: MinIO S3-compatible storage
- **Schedule**: Recurring jobs configured in `recurringjobs.yaml`
- **Retention**: Configurable per backup job

```bash
# List volumes
kubectl get volumes -n longhorn-system

# List backups
kubectl get backups -n longhorn-system

# Check backup target
kubectl get backuptargets -n longhorn-system
```

## Troubleshooting

```bash
# Check overall health
kubectl get nodes.longhorn.io -n longhorn-system

# Volume status
kubectl get volumes -n longhorn-system

# Replica status
kubectl get replicas -n longhorn-system

# Manager logs
kubectl logs -n longhorn-system deployment/longhorn-manager

# Check volume details
kubectl describe volume <volume-name> -n longhorn-system
```

### Common Issues

**Volume attachment failures:**

```bash
kubectl describe volume <volume-name> -n longhorn-system
kubectl describe node <node-name>
```

**Backup failures:**

```bash
kubectl get backups -n longhorn-system
kubectl exec -n minio-system deployment/minio -- mc admin info local
```

## References

- **[Longhorn Documentation](https://longhorn.io/docs/)** - Official docs
- **[Backup and Restore](https://longhorn.io/docs/1.6.0/snapshots-and-backups/)** - Backup guide
