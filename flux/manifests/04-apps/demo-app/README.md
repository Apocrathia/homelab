# Demo App - Baseline Application Template

This directory contains the deployment configuration for a demo application that serves as a **baseline template** for application configuration patterns.

> **Navigation**: [← Back to Apps README](../README.md)

## Overview

The demo app is a **baseline template** that demonstrates:

- **Application Deployment**: Basic application deployment patterns
- **Authentik Integration**: SSO integration through Authentik outpost
- **Gateway API Routing**: Traffic routing through Gateway API (handled by Authentik)
- **Storage Integration**: Both persistent (Longhorn) and shared (SMB) storage
- **Monitoring**: Application monitoring and observability

## Storage Pattern

The demo app demonstrates a dual storage approach:

- **Persistent Storage**: Longhorn volume for application data that needs to persist
- **Shared Storage**: SMB mount for shared file access

### Storage Files

- `persistent-storage.yaml` - Longhorn persistent storage (10Gi)
- `smb.yaml` - SMB file share integration
- `deployment.yaml` - Updated deployment using both storage types

## Accessing Persistent Storage

To access and manage files on the persistent storage:

```bash
# Get a pod name
kubectl get pods -n demo-app

# Access the persistent storage via exec
kubectl exec -it <pod-name> -n demo-app -- /bin/sh

# Inside the pod, navigate to the persistent storage
cd /app

# List files
ls -la

# Edit a file (if you have an editor)
vi filename.txt

# Copy files
cp source.txt destination.txt

# Create directories
mkdir new-folder

# Check disk usage
df -h /app
```

### File Operations from Host

You can also copy files to/from the persistent storage:

```bash
# Copy file from host to pod
kubectl cp local-file.txt <pod-name>:/app/ -n demo-app

# Copy file from pod to host
kubectl cp <pod-name>:/app/filename.txt ./ -n demo-app

# Copy between pods
kubectl cp <source-pod>:/app/file.txt <dest-pod>:/app/ -n demo-app
```

## Configuration

### Basic Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
  namespace: demo-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: demo-app
  template:
    metadata:
      labels:
        app: demo-app
    spec:
      containers:
        - name: demo-app
          image: nginx:alpine
          ports:
            - containerPort: 80
```

### Storage Integration

```yaml
# Persistent Storage (Longhorn)
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: demo-app-data
  namespace: demo-app
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 10Gi

---
# SMB Storage (Shared Content)
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: demo-app-smb-pvc
  namespace: demo-app
spec:
  accessModes:
    - ReadOnlyMany
  storageClassName: ""
  resources:
    requests:
      storage: 1Gi
```

## Access and Usage

### External Access

- **URL**: `https://demo.gateway.services.apocrathia.com`
- **Authentication**: SSO through Authentik
- **TLS**: Automatic TLS certificate management

### Internal Access

- **Service**: `http://demo-app.demo-app.svc:80`
- **Outpost**: `http://ak-outpost-demo-app-outpost.demo-app.svc:9000`
- **Persistent Storage**: Longhorn volume at `/app`
- **Shared Storage**: SMB mount at `/shared`

## Troubleshooting

### Common Issues

1. **Application Access Issues**

   ```bash
   # Check application pods
   kubectl get pods -n demo-app

   # Check service status
   kubectl get service -n demo-app
   ```

2. **Storage Issues**

   ```bash
   # Check PVC status for both storage types
   kubectl get pvc -n demo-app

   # Check Longhorn volumes
   kubectl get volumes -n longhorn-system | grep demo-app

   # Check SMB mount
   kubectl exec -it <pod-name> -n demo-app -- df -h
   ```

## Best Practices

### Template Development

1. **Pattern Extraction**: Identify common configuration patterns
2. **Value Parameterization**: Make configurations configurable
3. **Documentation**: Document all configurable parameters
4. **Testing**: Test template with different application types

### Storage Integration

1. **Use Longhorn for persistent data** that needs to survive pod restarts
2. **Use SMB for shared content** that multiple applications can access
3. **Right-size storage** - start small and expand as needed
4. **Enable backups** for critical data

## Resource Requirements

- **Application**: 100m-500m CPU, 128Mi-512Mi memory
- **Outpost**: 50m-200m CPU, 64Mi-256Mi memory
- **Persistent Storage**: 10Gi Longhorn volume
- **Shared Storage**: 1Gi SMB mount

## External Resources

- [Kubernetes Application Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Authentik Outpost Documentation](https://docs.goauthentik.io/docs/outposts/)
- [Gateway API HTTPRoute](https://gateway-api.sigs.k8s.io/api-types/httproute/)
- [SMB CSI Driver](https://github.com/kubernetes-csi/csi-driver-smb)
- [Longhorn Storage](https://longhorn.io/docs/)
