# Generic App Helm Chart

A generic Helm chart for deploying applications in the homelab environment with common patterns for storage, secrets, and authentication.

## Features

- **Kubernetes Resources**: Namespace, Deployment, Service
- **Container Support**:
  - Main application container with full configuration options
  - Init containers for setup tasks (permissions, initialization, etc.)
  - Sidecar containers for auxiliary services (logging, monitoring, etc.)
- **Storage Options**:
  - Multiple Longhorn persistent volumes for application data
  - Multiple SMB volumes for network file access
  - Container-specific volume mounting
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
    name: my-app # Container name (defaults to app name)
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
    tmpfs: # Tmpfs volumes (RAM-based, supports exec permissions)
      - name: run
        mountPath: /run
        options: "exec,size=100M"
    configMap: # ConfigMap volumes
      - name: my-config
        mountPath: /etc/config
        subPath: config.yaml
        readOnly: true
        configMapName: my-configmap
  initContainers: # Init containers (optional)
    - name: fix-permissions
      image: busybox:alpine
      command: ["sh", "-c"]
      args: ["chown -R 1000:1000 /app/assets && chmod -R 755 /app/assets"]
      volumeMounts:
        - name: my-app-data
          mountPath: /app
      securityContext:
        runAsUser: 0
        runAsGroup: 0
        runAsNonRoot: false
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
      # Optional: sidecar-specific security context
      # If not specified, inherits from app.securityContext
      securityContext:
        runAsUser: 0
        runAsNonRoot: false
        allowPrivilegeEscalation: true
        capabilities:
          add:
            - NET_ADMIN
            - SYS_ADMIN
          drop:
            - ALL
        readOnlyRootFilesystem: false
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
    fsGroupChangePolicy: "OnRootMismatch" # Automatically change volume ownership when it doesn't match fsGroup
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

The LinuxServer.io containers need to run as root initially for s6-overlay, then drop to the PUID/PGID specified in the environment variables.

```yaml
app:
  securityContext:
    runAsUser: "0" # Run as root initially (use string for Helm compatibility)
    runAsGroup: "0" # Run as root group initially (use string for Helm compatibility)
    fsGroup: 1000 # Files owned by group 1000
    fsGroupChangePolicy: "OnRootMismatch" # Automatically fix volume ownership
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
    fsGroupChangePolicy: "OnRootMismatch" # Automatically fix volume ownership
    runAsNonRoot: true
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    # capabilities defaults to drop: [ALL]
```

### Init Container Configuration

Init containers run before the main application container and are useful for setup tasks like fixing permissions, downloading files, or initializing databases.

```yaml
app:
  initContainers:
    - name: fix-permissions
      image: busybox:alpine
      command: ["sh", "-c"]
      args: ["chown -R 1000:1000 /app/assets && chmod -R 755 /app/assets"]
      volumeMounts:
        - name: my-app-data
          mountPath: /app
      securityContext:
        runAsUser: 0
        runAsGroup: 0
        runAsNonRoot: false
      resources:
        requests:
          cpu: 10m
          memory: 16Mi
        limits:
          cpu: 50m
          memory: 32Mi
```

**Common Use Cases:**

- **Volume Permission Fixing**: Fix ownership of mounted volumes before the main container starts
- **Database Initialization**: Run database migrations or setup scripts
- **File Downloads**: Download configuration files or assets
- **Dependency Installation**: Install packages or dependencies

### Storage Architecture

The chart uses a **two-tier storage system** optimized for different use cases:

#### **Pod-wide Storage** (`storage` section)

**For persistent volumes that survive pod restarts and can be shared across containers:**

```yaml
storage:
  # Longhorn persistent storage volumes
  longhorn:
    enabled: true
    volumes:
      - name: app-data
        capacity: 10Gi
      - name: cache
        capacity: 2Gi
      - name: logs
        capacity: 1Gi

  # SMB network storage volumes
  smb:
    enabled: true
    volumes:
      - name: static-files
        source: "//server/share"
        subDir: "path/to/files"
        credentialsPath: "vaults/Secrets/items/smb-creds"
        readOnly: true # Set to false for read-write access
```

**Characteristics:**

- ✅ **Persistent** - survives pod restarts
- ✅ **Shared** - multiple containers can mount the same volume
- ✅ **Flexible** - containers choose which volumes to mount and where
- ✅ **Centralized** - define storage once, mount where needed
- ✅ **Configurable Access** - supports both read-only (default) and read-write access modes

**SMB Volume Configuration Options:**

- `readOnly`: Controls access mode for the SMB volume
  - `true` (default): Read-only access, uses `ReadOnlyMany` access mode
  - `false`: Read-write access, uses `ReadWriteMany` access mode
  - **Security Note**: Read-only mode is recommended for shared network storage to prevent accidental data modification

#### **Container-specific Storage** (`app.volumes` section)

**For temporary storage and direct configuration mounting:**

```yaml
app:
  volumes:
    # EmptyDir volumes (temporary, die with pod)
    emptyDir:
      - name: cache
        mountPath: /tmp/cache
      - name: temp
        mountPath: /tmp

    # Tmpfs volumes (RAM-based, supports exec permissions)
    tmpfs:
      - name: run
        mountPath: /run
        options: "exec,size=100M"
      - name: tmp
        mountPath: /tmp
        options: "size=500M"

    # ConfigMap volumes (configuration files)
    configMap:
      - name: app-config
        mountPath: /etc/config
        subPath: app.conf
        readOnly: true
        configMapName: my-configmap
```

**Characteristics:**

- ✅ **Simple** - mount info included directly in definition
- ✅ **Temporary** - EmptyDir dies with pod (perfect for cache/temp)
- ✅ **Direct** - ConfigMap files mounted exactly where needed
- ✅ **Self-contained** - each volume definition includes its mount info
- ✅ **Container-specific** - available for main container, init containers, and sidecars
- ✅ **Exec permissions** - tmpfs supports exec flags for read-only containers

### Container Volume Mounting

The chart supports two types of volume configuration:

1. **Pod-wide storage** (from `storage` section) - referenced by name in `volumeMounts`
2. **Local storage** (emptyDir, tmpfs, configMap) - defined in `volumes` section

### Tmpfs Volumes

Tmpfs volumes are RAM-based temporary storage that support mount options like `exec` permissions. Perfect for:

- **Read-only containers** that need exec permissions (e.g., LinuxServer.io containers)
- **High-performance temporary storage** (faster than disk)
- **Process management directories** like `/run` for s6-overlay

```yaml
tmpfs:
  - name: run
    mountPath: /run
    options: "exec,size=100M" # exec permissions + 100MB limit
  - name: tmp
    mountPath: /tmp
    options: "size=500M" # 500MB limit, no exec needed
```

**Common mount options:**

- `exec` - Allow execution of binaries (required for s6-overlay)
- `noexec` - Disable execution (default)
- `size=N` - Set size limit (e.g., `size=100M`, `size=1G`)
- `rw` - Read-write access (default)
- `ro` - Read-only access

**Both can be used together** - the chart will mount all volumes from both sections:

```yaml
app:
  # Reference pod-wide storage by name
  volumeMounts:
    - name: app-data # References storage.longhorn
      mountPath: /app
    - name: shared-files # References storage.smb
      mountPath: /shared
      readOnly: true

  # Define local storage volumes
  volumes:
    emptyDir:
      - name: cache
        mountPath: /tmp/cache
      - name: logs
        mountPath: /var/log
    configMap:
      - name: config
        mountPath: /etc/config
        readOnly: true
        configMapName: app-config

  # Init container with volume mounts
  initContainers:
    - name: setup
      image: busybox
      volumeMounts:
        - name: app-data
          mountPath: /data
        - name: logs
          mountPath: /logs
      volumes:
        emptyDir:
          - name: init-temp
            mountPath: /tmp
        configMap:
          - name: init-config
            mountPath: /etc/init
            configMapName: init-configmap

  # Sidecar with volume mounts
  sidecars:
    - name: backup
      image: backup-image
      volumeMounts:
        - name: app-data
          mountPath: /backup/data
          readOnly: true
      volumes:
        emptyDir:
          - name: backup-cache
            mountPath: /var/cache/backup
        configMap:
          - name: backup-config
            mountPath: /etc/backup
            configMapName: backup-configmap
```

**Volume Naming**: Pod-wide volumes are automatically prefixed with the app name (e.g., `my-app-app-data`, `my-app-cache`). Container-specific volumes use the name as-is.

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
    - name: app-data
      capacity: 10Gi
    - name: cache
      capacity: 2Gi

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
    name: my-app
    port: 8000
    extraPorts:
      - name: satellite
        containerPort: 16622
        protocol: TCP
  volumeMounts:
    - name: app-data
      mountPath: /app
    - name: static-files
      mountPath: /app/static
      readOnly: true
  service:
    port: 8000
    targetPort: 8000
    extraServicePorts:
      - name: satellite
        port: 16622
        targetPort: 16622
        protocol: TCP

storage:
  longhorn:
    - name: app-data
      capacity: 10Gi
  smb:
    - name: static-files
      capacity: 1Gi
      source: "//storage.services.apocrathia.com/Library"
      subDir: "Sites/Demo"
      credentialsPath: "vaults/Secrets/items/smb-credentials"

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
  # Enable header-based authentication for reverse proxy auth (e.g., Grocy)
  interceptHeaderAuth: false
```

#### Authentik Configuration Options

- `enabled`: Enable/disable Authentik SSO integration
- `displayName`: Display name for the application in Authentik
- `externalHost`: External URL for the application
- `icon`: Icon URL for the application (optional)
- `openInNewTab`: Open application in new tab (default: true)
- `interceptHeaderAuth`: Enable header-based authentication for reverse proxy auth (default: false)
  - Set to `true` for applications like Grocy that use reverse proxy authentication
  - When enabled, Authentik will pass user information via headers

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

### Version 0.0.26 (Latest)

- **CRITICAL: Fixed Sidecar Security Context Inheritance**: Resolved issue where sidecar containers weren't properly applying custom security context settings

  - **Problem Solved**: Sidecar containers were ignoring custom `securityContext` configurations and always falling back to app-level defaults
  - **Template Logic Fixed**: Updated deployment template to properly handle sidecar-specific security context with conditional inheritance
  - **Inheritance Behavior**: Sidecars now correctly inherit from `app.securityContext` when no sidecar-specific context is defined
  - **Override Support**: Sidecars can now override specific security settings while inheriting others from the app level
  - **VPN Container Support**: Enables proper configuration of VPN sidecars (like Gluetun) that require elevated privileges and capabilities

- **Enhanced Documentation**: Added comprehensive sidecar security context documentation with examples and inheritance behavior

### Version 0.0.23

- **CRITICAL: Default Deployment Strategy Changed**: Changed default strategy from RollingUpdate to Recreate to prevent Multi-Attach errors

  - **Problem Solved**: RollingUpdate strategy causes Multi-Attach errors when upgrading apps with persistent volumes, leading to stuck HelmRelease upgrades
  - **New Default**: All apps now use Recreate strategy by default, which eliminates Multi-Attach errors completely
  - **Data Safety**: No data loss - persistent volumes survive pod restarts and maintain all application data
  - **Brief Downtime**: Apps experience ~30-60 seconds of downtime during upgrades (acceptable for homelab use)
  - **Stateless Override**: Stateless apps can explicitly set `strategy: "RollingUpdate"` to maintain zero-downtime updates
  - **Automatic Protection**: New apps with persistent volumes are automatically protected from Multi-Attach errors

- **BREAKING CHANGE: Strategy Configuration**: Deployment strategy now defaults to Recreate instead of RollingUpdate

  - **Migration Required**: Stateless apps must add `strategy: "RollingUpdate"` to maintain zero-downtime updates
  - **Stateful Apps**: No changes needed - automatically get the safe Recreate strategy
  - **Template Logic**: Simplified strategy logic - defaults to Recreate, only uses RollingUpdate when explicitly requested
  - **Documentation**: Updated values.yaml and README with clear guidance on when to use each strategy

### Version 0.0.22

- **ENHANCED: Improved Volume Mount Logic**: Fixed volume mounting to support both local and pod-wide storage simultaneously

  - **Dual Volume Support**: Chart now properly handles both `app.volumes` (local storage) and `app.volumeMounts` (pod-wide storage) in the same deployment
  - **Backward Compatible**: Existing deployments using only `app.volumes` or only `app.volumeMounts` continue to work unchanged
  - **Flexible Configuration**: Applications can now define local storage (emptyDir, configMap) alongside pod-wide storage (Longhorn, SMB) without conflicts
  - **Proper Volume Naming**: Volume names are correctly prefixed with app name for pod-wide storage, while local storage uses names as-is

- **FIXED: Volume Mount Conflicts**: Resolved issues where defining both `app.volumes` and `app.volumeMounts` caused deployment failures

  - **Template Logic Updated**: Chart now processes both volume types independently instead of using either/or logic
  - **Volume Creation**: All volumes (local and pod-wide) are properly created in the deployment
  - **Mount Resolution**: Volume mounts correctly reference their corresponding volumes

### Version 0.0.21

- **MAJOR: Complete Storage Architecture Overhaul**: Redesigned storage system with two-tier architecture

  - **Pod-wide Storage**: Longhorn/SMB volumes defined in `storage` section with `enabled` flags and `volumes` arrays
  - **Container-specific Storage**: EmptyDir/ConfigMap volumes defined in `app.volumes` with mount info included
  - **Consistent Structure**: All storage types now follow the same pattern with explicit `enabled` flags
  - **Enhanced Flexibility**: Container-specific volumes now available for main container, init containers, and sidecars

- **CRITICAL: Fixed Volume Mount Logic**: Resolved completely broken volume mounting system

  - **Fixed Conditional Logic**: Corrected `if .Values.app.volumeMounts` condition that was preventing custom mounts
  - **Proper Volume References**: Volume mounts now correctly reference prefixed volume names
  - **Resolved Mount Errors**: Fixed "volume not found" errors when using custom volume mounts

- **CRITICAL: Fixed Init Container Rendering**: Init containers now render properly

  - **Template Logic Fixed**: Init container template conditions now execute correctly
  - **Volume Mount Support**: Init containers can now mount both pod-wide and container-specific volumes
  - **Environment Variables**: Init container environment variables now render correctly

- **CRITICAL: Fixed Environment Variable Rendering**: Container environment variables now work

  - **Template Execution**: Environment variable loops now execute properly
  - **Value Rendering**: Environment variables from values.yaml now render in deployment

- **Enhanced Container-Specific Volumes**: Extended volume support to all container types

  - **Init Containers**: Can define `volumes.emptyDir` and `volumes.configMap` with mount info
  - **Sidecars**: Can define `volumes.emptyDir` and `volumes.configMap` with mount info
  - **Main Container**: Existing `app.volumes` support maintained and improved

- **Updated Documentation**: Comprehensive documentation overhaul
  - **Storage Architecture**: Clear explanation of pod-wide vs container-specific storage
  - **Usage Examples**: Updated examples showing new structure and capabilities
  - **Volume Naming**: Documented volume naming conventions and patterns

### Version 0.0.20

- **Fixed Volume Processing Logic**: Resolved critical issue where storage volumes weren't being created
  - **Removed Problematic Conditions**: Fixed template conditions that prevented longhorn/SMB volumes from being processed
  - **Direct Volume Processing**: Storage volumes are now processed directly from configuration arrays
  - **Resolved Mount Errors**: Fixed "volume not found" errors when using custom volume mounts
  - **Maintained Override Logic**: Custom volumeMounts still properly override default volumes

### Version 0.0.19

- **Fixed Volume Mount Logic**: Custom `volumeMounts` now properly override default volumes
  - **Clean Volume Configuration**: When `app.volumeMounts` is defined, default nginx volumes are excluded
  - **Fixed Volume Creation**: Longhorn volumes are now properly created in deployment spec
  - **Resolved Mount Errors**: Fixed "volume not found" errors when using custom volume mounts
  - **Improved Flexibility**: Better separation between default and custom volume configurations

### Version 0.0.18

- **BREAKING CHANGE: Multi-Volume Storage Support**: Complete rewrite of storage configuration
  - **New Array-Based Storage**: Define multiple volumes per storage type using simple arrays
  - **Container-Specific Mounting**: Each container specifies which volumes to mount and where
  - **Simplified Configuration**: Remove `enabled` flags and `mountPath` from storage definitions
  - **Consistent Volume Naming**: Volumes automatically prefixed with app name (e.g., `my-app-data`)
  - **Flexible Volume Usage**: Init containers, sidecars, and main containers can all mount different volumes
  - **Migration Required**: Existing deployments must update to new format (see Breaking Changes section)

### Version 0.0.17

- **Fixed Volume Naming Consistency**: Longhorn volume names now match PVC names
  - Volume name changed from hardcoded `app-data` to dynamic `{{ .Values.app.name }}-data`
  - Ensures consistent naming between PVC creation and pod volume references
  - Resolves confusion when referencing volumes in init containers and sidecars

### Version 0.0.16

- **Init Container Support**: Added support for init containers
  - `initContainers`: Configure init containers for setup tasks before main container starts
  - Perfect for fixing volume permissions, database initialization, and dependency setup
  - Full configuration support including security context, volume mounts, and resources
  - Resolves complex permission issues that `fsGroup` alone cannot handle

### Version 0.0.15

- **Enhanced Volume Permission Management**: Added `fsGroupChangePolicy` support
  - `fsGroupChangePolicy`: Automatically change volume ownership when it doesn't match fsGroup
  - Set to `"OnRootMismatch"` to automatically fix volume permissions on mount
  - Essential for applications with persistent volumes that need specific user/group ownership
  - Resolves common permission issues with mounted volumes in Kubernetes

### Version 0.0.14

- **Enhanced Authentik Integration**: Added configurable header-based authentication
  - `interceptHeaderAuth`: Enable/disable header-based authentication for reverse proxy auth
  - Essential for applications like Grocy that use reverse proxy authentication
  - Maintains backward compatibility with existing configurations

### Version 0.0.13

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
