# Demo App - Baseline Application Template

This directory contains the deployment configuration for a demo application that serves as a **baseline template** for application configuration patterns. The demo app is deployed using the [generic-app Helm chart](../../../helm/generic-app/README.md).

> **Navigation**: [← Back to Apps README](../README.md)

## Overview

The demo app is a **baseline template** that demonstrates:

- **Helm Chart Deployment**: Uses the generic-app chart for reusable application patterns
- **Application Deployment**: Basic application deployment patterns
- **Authentik Integration**: SSO integration through Authentik outpost
- **Gateway API Routing**: Traffic routing through Gateway API (handled by Authentik)
- **Storage Integration**: Both persistent (Longhorn) and shared (SMB) storage
- **Monitoring**: Application monitoring and observability

## Deployment Method

The demo app is deployed using **Flux GitOps** with a HelmRelease resource that references the `generic-app` chart. This approach provides:

- **Reusable Templates**: Common patterns that can be applied to other applications
- **GitOps Workflow**: Declarative deployment through Git commits
- **Simplified Configuration**: Values-based configuration instead of raw manifests
- **Maintainability**: Single source of truth for application deployment patterns

## Current Structure

This directory now contains:

- `helmrelease.yaml` - Flux HelmRelease resource that deploys the app using generic-app chart
- `kustomization.yaml` - Kustomize configuration for Flux deployment
- `README.md` - This documentation

The following files are **no longer used** (replaced by chart templates):

- ~~`deployment.yaml`~~ - Now generated from chart template
- ~~`service.yaml`~~ - Now generated from chart template
- ~~`secret.yaml`~~ - Now generated from chart template
- ~~`storage.yaml`~~ - Now generated from chart template
- ~~`smb.yaml`~~ - Now generated from chart template
- ~~`authentik-blueprint.yaml`~~ - Now generated from chart template

## Storage Pattern

The demo app demonstrates a dual storage approach:

- **Persistent Storage**: Longhorn volume for application data that needs to persist
- **Shared Storage**: SMB mount for shared file access

### Chart Configuration

The storage configuration is managed through the HelmRelease values:

- **Longhorn Storage**: Configured via `storage.longhorn` values
- **SMB Storage**: Configured via `storage.smb` values
- **Deployment**: Generated from chart templates with volume mounts
- **GitOps**: Automatic reconciliation through Flux when values change

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

### Flux HelmRelease Configuration

The demo app is deployed using Flux GitOps with this HelmRelease resource:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: demo-app
  namespace: demo-app
spec:
  interval: 15m
  chart:
    spec:
      chart: ./helm/generic-app
      sourceRef:
        kind: GitRepository
        name: homelab
        namespace: flux-system
  values:
    # Application-specific values...
```

The HelmRelease contains the configuration that makes this demo app unique:

```yaml
# Values passed to the generic-app Helm chart
app:
  name: demo-app
  # renovate: datasource=docker depName=nginx
  image: nginx:alpine
  volumes:
    emptyDir:
      - name: nginx-cache
        mountPath: /var/cache/nginx
      - name: nginx-run
        mountPath: /run

storage:
  longhorn:
    enabled: true
    capacity: 10Gi
    mountPath: /app
  smb:
    enabled: true
    source: "//storage.services.apocrathia.com/Library"
    subDir: "Sites/Demo"
    mountPath: /usr/share/nginx/html
    credentialsPath: "vaults/Secrets/items/smb-credentials"

secrets:
  enabled: true
  itemPath: "vaults/Secrets/items/demo-app-secrets"

authentik:
  enabled: true
  displayName: "Demo Application"
  externalHost: "https://demo.gateway.services.apocrathia.com"
  icon: "https://i.imgur.com/0gNsvyk.png"

httproute:
  enabled: false
```

### Key Configuration Values

- **Application**: nginx:alpine with nginx-specific cache and run volumes
- **Storage**: Dual storage pattern - Longhorn for app data, SMB for static content
- **Mount Paths**: Clearly defined for both storage types
- **Authentication**: Authentik SSO with custom display name and icon
- **Secrets**: 1Password integration for sensitive configuration
- **Networking**: Uses Authentik outpost (HTTPRoute disabled)

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

### Using the Generic-App Chart

1. **Copy the Pattern**: Use this demo app as a starting template for new applications
2. **Customize Values**: Change app name, image, storage paths, and authentication details
3. **Keep It Simple**: Only specify values that differ from chart defaults
4. **Test Configuration**: Use `helm template` to verify generated resources

**Template Pattern**:

```bash
# Create namespace for your new app (Flux will handle this automatically)
kubectl create namespace my-new-app

# Copy the demo app directory as a starting point
cp -r flux/manifests/04-apps/demo-app flux/manifests/04-apps/my-new-app

# Edit the helmrelease.yaml for your specific application
# - Change metadata.name and app.name
# - Update app.image and other values
# - Adjust storage mount paths if needed
# - Update Authentik display name and external host
# - Modify secrets path for your app

# Update kustomization.yaml to reference your new app
# Commit and push to trigger Flux deployment
```

For detailed chart documentation, see [Generic-App Chart README](../../../helm/generic-app/README.md)

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
