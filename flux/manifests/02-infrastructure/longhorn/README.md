# Longhorn - Distributed Storage

Distributed block storage system for Kubernetes with replication, backup, and disaster recovery.

> **Navigation**: [← Back to Infrastructure README](../README.md)

## Documentation

- **[Longhorn Documentation](https://longhorn.io/docs/)** - Official documentation
- **[Architecture Guide](https://longhorn.io/docs/1.6.0/concepts/)** - System architecture
- **[Backup and Restore](https://longhorn.io/docs/1.6.0/snapshots-and-backups/)** - Backup documentation

## Overview

Longhorn provides persistent storage for Kubernetes workloads with features like:

- **Distributed Storage**: Replicated block storage across cluster nodes
- **Backup & Restore**: Automated backup to SMB storage
- **Disaster Recovery**: Cross-cluster replication and failover
- **Data Locality**: Best-effort data placement allowing replicas on different nodes for better availability
- **Volume Management**: Dynamic provisioning and expansion

## Architecture

### Components

- **Longhorn Manager**: Control plane managing volumes and nodes
- **Longhorn Engine**: Data plane handling I/O operations
- **Longhorn UI**: Web-based management interface
- **Longhorn Driver**: CSI driver for Kubernetes integration

### Storage Configuration

#### Persistent Storage

- **Storage Class**: `longhorn` (default)
- **Replicas**: 3 replicas per volume (configurable)
- **Access Modes**: `ReadWriteOnce`, `ReadWriteMany`
- **Volume Expansion**: Online expansion supported

#### Backup Configuration

- **Backup Target**: MinIO S3-compatible storage
- **Schedule**: Automated recurring backups
- **Retention**: Configurable retention policies

## 1Password Setup

Before deploying Longhorn, create the backup target credentials in 1Password:

1. In your 1Password vault, create a new item called `longhorn-backup-target-secret`
2. Add these fields:
   - **Field Label**: `AWS_ACCESS_KEY_ID` | **Value**: `your-minio-access-key`
   - **Field Label**: `AWS_SECRET_ACCESS_KEY` | **Value**: `your-minio-secret-key`
   - **Field Label**: `AWS_ENDPOINTS` | **Value**: `http://minio.minio-system.svc:9000`

The 1Password Connect Operator will automatically create a Kubernetes secret with these values.

## Features

### Data Protection

- **Replication**: 3-way replication for high availability
- **Snapshots**: Point-in-time volume snapshots
- **Backup**: Automated backup to external storage
- **Disaster Recovery**: Volume-level disaster recovery

### Performance

- **Caching**: Intelligent read/write caching
- **Data Locality**: Best-effort placement (replicas can be on different nodes)
- **I/O Scheduling**: Optimized I/O path
- **Resource Management**: Configurable resource limits

### Management

- **Web UI**: Built-in management interface
- **Metrics**: Prometheus integration
- **Alerts**: Integration with monitoring stack
- **Auto-scaling**: Dynamic replica management

## Access and Usage

### Web UI Access

- **Internal URL**: `http://longhorn-frontend.longhorn-system.svc:80`
- **External Access**: Via Gateway API with Authentik authentication
- **Authentication**: Integrated with Authentik SSO

### Storage Class Usage

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

### Volume Operations

```bash
# List volumes
kubectl get volumes -n longhorn-system

# Create snapshot
kubectl create -f volume-snapshot.yaml

# List backups
kubectl get backups -n longhorn-system
```

## Integration with Homelab

### Authentik Integration

- **Authentication**: SSO through Authentik outpost
- **Authorization**: Role-based access control
- **Blueprint**: Automated user and group management

### Monitoring Stack

- **Metrics**: Prometheus metrics collection
- **Dashboards**: Grafana visualization
- **Alerts**: Automated alerting for storage issues

### Backup Integration

- **MinIO Storage**: S3-compatible backup target
- **Automated Backups**: Scheduled backup jobs
- **Retention Policies**: Configurable cleanup

## Configuration

### Storage Settings

- **Default Replica Count**: Configured in `helmrelease.yaml`
- **Data Locality**: `best-effort` (replicas can be on different nodes for better availability)
- **Storage Over-provisioning**: 100%
- **Snapshot Retention**: Configured in `helmrelease.yaml`
- **Backup Retention**: Configurable via recurring jobs

### Resource Requirements

Resource limits and requests are configured in `helmrelease.yaml`.

### Node Configuration

- **Storage Path**: `/var/lib/longhorn` (default)
- **Scheduling**: Anti-affinity for high availability
- **Taints/Tolerations**: Configurable node selection

## Backup and Recovery

### Automated Backups

- **Schedule**: Daily backups configured
- **Target**: MinIO S3-compatible storage
- **Retention**: 30-day retention policy
- **Compression**: Automatic data compression

### Manual Operations

```bash
# Manual backup
kubectl create -f manual-backup.yaml

# Restore from backup
kubectl create -f restore.yaml

# List backup targets
kubectl get backuptargets -n longhorn-system
```

## Security Considerations

- **Network Policies**: Restrict access to Longhorn components
- **RBAC**: Minimal permissions for management operations
- **Encryption**: Data encryption at rest and in transit
- **Authentication**: SSO integration with Authentik

## Troubleshooting

### Common Issues

1. **Volume Attachment Failures**

   ```bash
   # Check volume status
   kubectl describe volume <volume-name> -n longhorn-system

   # Check node storage
   kubectl describe node <node-name>
   ```

2. **Backup Failures**

   ```bash
   # Check backup status
   kubectl get backups -n longhorn-system

   # Verify MinIO connectivity
   kubectl exec -n minio-system deployment/minio -- mc admin info local
   ```

3. **Performance Issues**

   ```bash
   # Check Longhorn metrics
   kubectl port-forward -n longhorn-system svc/longhorn-frontend 8080:80

   # Monitor I/O statistics
   kubectl get volumes -n longhorn-system -o wide
   ```

### Health Checks

```bash
# Check overall health
kubectl get nodes.longhorn.io -n longhorn-system

# Check volume health
kubectl get volumes -n longhorn-system

# Check replica status
kubectl get replicas -n longhorn-system
```

### Log Analysis

```bash
# Manager logs
kubectl logs -n longhorn-system deployment/longhorn-manager

# Engine logs
kubectl logs -n longhorn-system -l longhorn-engine

# UI logs
kubectl logs -n longhorn-system deployment/longhorn-ui
```

## Best Practices

### Storage Management

1. **Resource Planning**: Monitor storage usage and plan capacity
2. **Backup Strategy**: Regular backups with testing
3. **Disaster Recovery**: Test recovery procedures regularly
4. **Performance Monitoring**: Monitor I/O patterns and bottlenecks

### Operations

1. **Version Updates**: Keep Longhorn updated for security fixes
2. **Node Maintenance**: Plan for node maintenance windows
3. **Monitoring**: Set up comprehensive monitoring and alerting
4. **Documentation**: Maintain updated documentation

### Security

1. **Access Control**: Limit access to Longhorn UI and API
2. **Network Security**: Use network policies to restrict traffic
3. **Backup Security**: Secure backup credentials and data
4. **Audit Logging**: Enable audit logging for compliance
