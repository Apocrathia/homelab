# CSI Driver SMB - SMB Storage Integration

This directory contains the deployment configuration for the CSI Driver for SMB (Server Message Block) storage, enabling Kubernetes workloads to use SMB file shares as persistent volumes.

> **Navigation**: [← Back to Infrastructure README](../README.md)

## Overview

The CSI Driver for SMB allows Kubernetes pods to mount SMB file shares as persistent volumes, providing:

- **SMB Protocol Support**: Native SMB/CIFS protocol support
- **Dynamic Provisioning**: On-demand volume creation
- **Access Control**: Username/password authentication
- **Multi-tenant Access**: Shared storage for multiple workloads

## Architecture

### Components

- **CSI Driver**: Implements CSI specification for SMB
- **Node Plugin**: Runs on each node for volume mounting
- **Controller Plugin**: Manages volume lifecycle and provisioning
- **SMB Client**: Handles SMB protocol communication

### Storage Classes

The deployment includes multiple storage classes for different use cases:

#### Basic SMB Storage Class

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: smb
parameters:
  source: "//server/share"
  csi.storage.k8s.io/provisioner-secret-name: smbcreds
  csi.storage.k8s.io/provisioner-secret-namespace: default
  csi.storage.k8s.io/node-stage-secret-name: smbcreds
  csi.storage.k8s.io/node-stage-secret-namespace: default
```

#### ReadWriteMany SMB Storage Class

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: smb-rw-many
parameters:
  source: "//server/share"
  csi.storage.k8s.io/provisioner-secret-name: smbcreds
  csi.storage.k8s.io/provisioner-secret-namespace: default
  csi.storage.k8s.io/node-stage-secret-name: smbcreds
  csi.storage.k8s.io/node-stage-secret-namespace: default
```

## Features

### Storage Capabilities

- **File Sharing**: Native SMB file sharing protocol
- **Concurrent Access**: ReadWriteMany support for shared access
- **Dynamic Provisioning**: On-demand volume creation
- **Volume Expansion**: Online volume expansion support

### Security Features

- **Authentication**: Username/password authentication
- **Encryption**: SMB encryption support
- **Access Control**: File and directory permissions
- **Network Security**: SMB signing and sealing

### Performance

- **Caching**: Client-side caching support
- **Connection Pooling**: Optimized connection management
- **I/O Optimization**: Configurable I/O parameters
- **Multi-channel**: Multiple connection channels

## Configuration

### Prerequisites

1. **SMB Server**: Accessible SMB server with shares configured
2. **Credentials**: Username/password for SMB authentication
3. **Network Access**: Network connectivity to SMB server
4. **Permissions**: Appropriate file system permissions

### Secret Configuration

Create credentials secret for SMB authentication:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: smbcreds
  namespace: default
type: Opaque
data:
  username: <base64-encoded-username>
  password: <base64-encoded-password>
```

### Storage Class Parameters

- **source**: SMB server and share path (`//server/share`)
- **subDir**: Optional subdirectory within the share
- **createSubDir**: Create subdirectory if it doesn't exist (true/false)
- **domain**: Active Directory domain (optional)
- **mountOptions**: Additional mount options

## Usage Examples

### Basic PVC with SMB Storage

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: smb-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: smb
  resources:
    requests:
      storage: 1Gi
```

### Pod Using SMB Volume

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: smb-pod
spec:
  containers:
    - name: app
      image: nginx
      volumeMounts:
        - name: smb-volume
          mountPath: /data
  volumes:
    - name: smb-volume
      persistentVolumeClaim:
        claimName: smb-pvc
```

### ReadWriteMany Example

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-smb-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: smb-rw-many
  resources:
    requests:
      storage: 1Gi
```

## Integration with Homelab

### Authentik Integration

- **Authentication**: SSO for web-based file access
- **Authorization**: Role-based access to SMB shares
- **Audit Logging**: Access logging and monitoring

### Monitoring Stack

- **Metrics**: CSI driver performance metrics
- **Alerts**: Storage connectivity and performance alerts
- **Dashboards**: Grafana visualization for storage usage

### Backup Integration

- **Backup Support**: Integration with Longhorn backups
- **Snapshot Support**: Volume snapshot capabilities
- **Data Protection**: Automated backup scheduling

## Security Considerations

### Network Security

- **SMB Signing**: Enable SMB signing for data integrity
- **SMB Encryption**: Use SMB 3.0 encryption when available
- **Firewall Rules**: Restrict SMB traffic to authorized nodes
- **Network Policies**: Kubernetes network policies for CSI traffic

### Authentication Security

- **Credential Management**: Secure storage of SMB credentials
- **Password Rotation**: Regular password rotation procedures
- **Access Control**: Least privilege access to SMB shares
- **Audit Logging**: Monitor access patterns and anomalies

### Data Protection

- **Encryption**: Data encryption in transit
- **Backup**: Regular backup of SMB data
- **Access Logging**: Comprehensive access logging
- **Compliance**: Meet regulatory compliance requirements

## Troubleshooting

### Common Issues

1. **Mount Failures**

   ```bash
   # Check CSI driver logs
   kubectl logs -n kube-system -l app=csi-smb-node

   # Verify SMB connectivity
   smbclient -U username //server/share -c 'ls'
   ```

2. **Authentication Errors**

   ```bash
   # Check credential secret
   kubectl describe secret smbcreds -n default

   # Test credentials
   smbclient -U username%password //server/share -c 'ls'
   ```

3. **Permission Issues**
   ```bash
   # Check file permissions on SMB server
   # Verify share permissions
   # Check CSI driver permissions
   ```

### Health Checks

```bash
# Check CSI driver status
kubectl get pods -n kube-system -l app=csi-smb

# Check storage class
kubectl get storageclass smb

# Check PVC status
kubectl describe pvc <pvc-name>
```

### Log Analysis

```bash
# Controller logs
kubectl logs -n kube-system deployment/csi-smb-controller

# Node logs
kubectl logs -n kube-system daemonset/csi-smb-node
```

### Network Testing

```bash
# Test SMB connectivity from pod
kubectl exec -it <pod-name> -- smbclient -U user%pass //server/share -c 'ls'

# Test DNS resolution
kubectl exec -it <pod-name> -- nslookup server
```

## Best Practices

### Storage Management

1. **Capacity Planning**: Monitor storage usage and plan capacity
2. **Performance Monitoring**: Monitor I/O patterns and bottlenecks
3. **Backup Strategy**: Regular backups with testing
4. **Documentation**: Maintain updated share mappings

### Security

1. **Access Control**: Limit access to SMB shares
2. **Network Security**: Use encryption and secure protocols
3. **Monitoring**: Monitor access patterns and anomalies
4. **Audit**: Regular security audits and compliance checks

### Operations

1. **Version Updates**: Keep CSI driver updated for security fixes
2. **Maintenance**: Plan for SMB server maintenance windows
3. **Monitoring**: Set up comprehensive monitoring and alerting
4. **Troubleshooting**: Maintain troubleshooting procedures

## Resource Requirements

Resource limits and requests are configured in `helmrelease.yaml`.

## External Resources

- [CSI Driver SMB Documentation](https://github.com/kubernetes-csi/csi-driver-smb)
- [SMB Protocol Documentation](https://docs.microsoft.com/en-us/windows/win32/fileio/microsoft-smb-protocol)
- [Kubernetes CSI Specification](https://github.com/container-storage-interface/spec)
- [SMB Security Best Practices](https://docs.microsoft.com/en-us/troubleshoot/windows-server/networking/smb-security-best-practices)
