# Generic App Helm Chart

A generic Helm chart for deploying applications in the homelab environment with common patterns for storage, secrets, and authentication.

## Features

- **Kubernetes Resources**: Namespace, Deployment, Service
- **Container Support**:
  - Main application container with full configuration options
  - Sidecar containers for auxiliary services (logging, monitoring, etc.)
- **Storage Options**:
  - Longhorn persistent storage for application data
  - SMB storage for network file access
- **Security**: 1Password Connect integration for secrets management
- **Authentication**: Authentik SSO integration with automatic outpost deployment
- **Networking**:
  - Optional HTTPRoute for direct Gateway API access (when not using Authentik)
  - TCP routes for additional ports
  - LoadBalancer service for direct external access with multiple ports

## Values Configuration

### Application Settings

```yaml
app:
  name: my-app # Application name (used for namespace and resources)
  # renovate: datasource=docker depName=nginx
  image: nginx:alpine # Container image (single value for renovate compatibility)
  container:
    port: 80 # Main container port
    extraPorts: # Additional container ports (optional)
      - name: satellite
        containerPort: 16622
        protocol: TCP
    env: # Environment variables (optional)
      - name: EXAMPLE_VAR
        value: "example-value"
      - name: SECRET_VAR
        valueFrom:
          secretKeyRef:
            name: my-secret
            key: password
  # Optional: override the default container command
  command: ["/custom/entrypoint"]
  # Optional: override the default container arguments
  args: ["--custom-arg", "value"]
  service:
    extraServicePorts: # Additional service ports (optional)
      - name: satellite
        port: 16622
        targetPort: 16622
        protocol: TCP
  volumes: # Volume configuration (optional)
    emptyDir: # EmptyDir volumes
      - name: cache
        mountPath: /tmp/cache
    configMap: # ConfigMap volumes
      - name: my-config
        mountPath: /etc/config
        subPath: config.yaml
        readOnly: true
        configMapName: my-configmap
  sidecars: # Sidecar containers (optional)
    - name: nginx-sidecar
      image: nginx:alpine
      command: ["/bin/sh"]
      args: ["-c", "while true; do echo 'Sidecar running'; sleep 30; done"]
      ports:
        - containerPort: 8080
          name: sidecar-port
      env:
        - name: SIDECAR_VAR
          value: "sidecar-value"
      volumeMounts:
        - name: shared-data
          mountPath: /shared
      resources:
        requests:
          cpu: 10m
          memory: 16Mi
        limits:
          cpu: 50m
          memory: 32Mi
```

**Note**: Most settings like replicas, resources, security context use sensible defaults and don't need to be specified unless you need custom values.

### Security Context Configuration

```yaml
app:
  securityContext:
    runAsUser: 1000 # User ID to run container as
    runAsGroup: 1000 # Group ID to run container as
    fsGroup: 1000 # File system group ID for volumes
    runAsNonRoot: true # Require non-root user (set to false for init containers)
    allowPrivilegeEscalation: false # Allow privilege escalation (set to true if needed)
    readOnlyRootFilesystem: true # Mount root filesystem as read-only (set to false for LSIO containers)
    capabilities:
      add: # Capabilities to add (useful for init containers)
        - SETUID # Allow changing user IDs
        - SETGID # Allow changing group IDs
        - CHOWN # Allow changing file ownership
        - DAC_OVERRIDE # Allow bypassing file permission checks
      drop: # Capabilities to drop (defaults to ALL if not specified)
        - NET_RAW # Drop network raw socket capability
```

#### Common Use Cases:

**LinuxServer.io Containers** (e.g., Grocy, Plex, etc.):

```yaml
app:
  securityContext:
    runAsUser: "0" # Run as root initially (use string for Helm compatibility)
    runAsGroup: "0" # Run as root group initially (use string for Helm compatibility)
    fsGroup: 1000 # Files owned by group 1000
    runAsNonRoot: "false" # Allow running as root
    allowPrivilegeEscalation: "true" # Allow s6-overlay to work
    readOnlyRootFilesystem: "false" # Allow filesystem writes
    capabilities:
      add:
        - SETUID # Required for s6-overlay
        - SETGID # Required for s6-overlay
        - CHOWN # Required for file permissions
        - DAC_OVERRIDE # Required for init processes
```

**Standard Non-Root Applications** (default):

```yaml
app:
  securityContext:
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
    runAsNonRoot: true
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    # capabilities defaults to drop: [ALL]
```

### Storage Configuration

```yaml
storage:
  longhorn:
    enabled: true # Enable Longhorn persistent storage
    capacity: 10Gi # Capacity (size in bytes calculated automatically)
    mountPath: /app # Mount path in container

  smb:
    enabled: true # Enable SMB storage
    source: "//server/share" # SMB share path
    subDir: "path/to/files" # Subdirectory within share
    mountPath: /data # Mount path in container
    credentialsPath: "vaults/Secrets/items/smb-creds" # 1Password path
```

### Authentication

```yaml
authentik:
  enabled: true
  displayName: "My Application"
  externalHost: "https://my-app.domain.com"
  icon: "https://example.com/icon.png"
```

### Secrets

```yaml
secrets:
  enabled: true
  itemPath: "vaults/Secrets/items/my-app-secrets"
```

## Usage Example

### Direct Helm Install

```bash
# Create the namespace first
kubectl create namespace my-app

# Install the application
helm install my-app ./helm/generic-app --namespace my-app --values my-values.yaml
```

### Values File Example

```yaml
# my-values.yaml
app:
  name: my-app
  # renovate: datasource=docker depName=my-app
  image: my-app:1.0.0
  volumes:
    emptyDir:
      - name: cache
        mountPath: /tmp/cache

storage:
  longhorn:
    enabled: true
    capacity: 10Gi
    mountPath: /app

authentik:
  enabled: true
  displayName: "My Application"
  externalHost: "https://my-app.gateway.services.apocrathia.com"

secrets:
  enabled: true
  itemPath: "vaults/Secrets/items/my-app-secrets"
```

### TCP Route Configuration

```yaml
tcproute:
  enabled: true
  routes:
    - name: my-service
      port: 16623
      gateway:
        name: main-gateway
        namespace: cilium-system
```

**Features:**

- Automatically adds ports to the service
- Creates TCPRoute resources for external access
- Auto-generates unique section names if not specified

### LoadBalancer Configuration

```yaml
loadbalancer:
  enabled: true
  ip: "10.100.1.100" # Static IP for LoadBalancer
  ports:
    - name: satellite
      port: 16622
      targetPort: 16622
      protocol: TCP
    - name: satellite-2
      port: 16623
      targetPort: 16623
      protocol: TCP
```

### Complete Example

```yaml
app:
  name: my-app
  image: my-app:latest
  container:
    port: 8000
    extraPorts:
      - name: satellite
        containerPort: 16622
        protocol: TCP
  service:
    port: 8000
    targetPort: 8000
    extraServicePorts:
      - name: satellite
        port: 16622
        targetPort: 16622
        protocol: TCP

loadbalancer:
  enabled: true
  ip: "10.100.1.100"
  externalTrafficPolicy: Cluster
  ports:
    - name: satellite
      port: 16622
      targetPort: 16622
      protocol: TCP

authentik:
  enabled: true
  displayName: "My Application"
  externalHost: "https://my-app.gateway.services.apocrathia.com"
```

For a complete working example, see the [Companion app configuration](../../flux/manifests/04-apps/companion/helmrelease.yaml).

## Components

### Core Resources

- `deployment.yaml`: Application deployment with security contexts
- `service.yaml`: ClusterIP service for the application

### Storage

- `storage-longhorn.yaml`: Longhorn volume, PV, and PVC (conditional)
- `storage-smb.yaml`: SMB PV, PVC, and credentials (conditional)

### Security & Auth

- `secrets.yaml`: 1Password secret integration (conditional)
- `authentik-blueprint.yaml`: Authentik SSO configuration (conditional)
- `httproute.yaml`: Direct Gateway API access (conditional, only when Authentik disabled)

### Networking

- `tcproute.yaml`: TCP routes for additional ports (conditional)
- `service-loadbalancer.yaml`: LoadBalancer service for direct external access with configurable external traffic policy (conditional)
- `loadbalancer.yaml`: Cilium L2 announcement and IP pool configuration (conditional)

## Design Principles

- **Zero Dependencies**: No external chart dependencies
- **Convention over Configuration**: Sensible defaults with minimal required configuration
- **Conditional Components**: Only deploy what you need
- **Automatic Configuration**: Routing automatically generated
- **Security First**: Non-root containers (UID 1000), read-only filesystems, dropped capabilities
- **Homelab Optimized**: Designed for typical homelab use cases and infrastructure
- **Renovate Compatible**: Single image values for automatic dependency updates
- **Simple Configuration**: Only specify what makes your app unique

## Changelog

### Version 0.0.13 (Latest)

- **Fixed Pod-Level Security Context**: Made pod `runAsNonRoot` configurable instead of hardcoded
  - Resolves conflicts between pod and container security contexts
  - Essential for LinuxServer.io containers that need to run as root
  - Ensures consistent security settings across pod and container levels

### Version 0.0.12

- **Enhanced Capabilities Configuration**: Added support for configurable Linux capabilities
  - Can now add specific capabilities (SETUID, SETGID, CHOWN, DAC_OVERRIDE, etc.)
  - Supports both adding and dropping capabilities
  - Applied to both main container and sidecar containers
- **LinuxServer.io Support**: Full support for containers requiring elevated privileges during initialization

### Version 0.0.11

- **Enhanced Security Context Options**: Added configurable security settings
  - `runAsNonRoot`: Allow or disallow running as root user
  - `allowPrivilegeEscalation`: Control privilege escalation permissions
  - Templates updated to use values-driven configuration instead of hardcoded settings

### Version 0.0.10

- **Read-Only Root Filesystem Control**: Added `readOnlyRootFilesystem` option
  - Configurable read-only root filesystem (default: true)
  - Essential for LinuxServer.io containers that need write access during s6-overlay initialization
  - Templates updated to use dynamic configuration from values.yaml
