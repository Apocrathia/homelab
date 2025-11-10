# Generic App Helm Chart

A generic Helm chart for deploying applications in the homelab environment with common patterns for storage, secrets, and authentication.

## Features

- **Kubernetes Resources**: Namespace, Deployment, Service
- **Container Support**:
  - Main application container with full configuration options
  - Init containers for setup tasks (permissions, initialization, etc.)
  - Sidecar containers for auxiliary services (logging, monitoring, etc.)
- **Health Checks**: Optional liveness, readiness, and startup probes for main containers and sidecars
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

## Values Reference

All available configuration values for the chart:

| Path                                           | Type   | Default                                           | Description                                                   |
| ---------------------------------------------- | ------ | ------------------------------------------------- | ------------------------------------------------------------- |
| `app.name`                                     | string | `demo-app`                                        | Application name used for resource naming                     |
| `app.namespace`                                | string | `""`                                              | Namespace (defaults to app.name if not specified)             |
| `app.image`                                    | string | `nginx:alpine`                                    | Container image (single value for renovate compatibility)     |
| `app.container.name`                           | string | `nginx`                                           | Container name                                                |
| `app.container.port`                           | int    | `80`                                              | Main container port                                           |
| `app.container.extraPorts`                     | array  | `[]`                                              | Additional container ports                                    |
| `app.container.env`                            | array  | `[]`                                              | Environment variables                                         |
| `app.command`                                  | array  | `[]`                                              | Override default container command                            |
| `app.args`                                     | array  | `[]`                                              | Override default container arguments                          |
| `app.initContainers`                           | array  | `[]`                                              | Init container configurations                                 |
| `app.sidecars`                                 | array  | `[]`                                              | Sidecar container configurations                              |
| `app.replicas`                                 | int    | `1`                                               | Number of pod replicas                                        |
| `app.strategy`                                 | string | `Recreate`                                        | Deployment strategy (Recreate or RollingUpdate)               |
| `app.strategy.rollingUpdate.maxSurge`          | string | `"25%"`                                           | Max surge for rolling update                                  |
| `app.strategy.rollingUpdate.maxUnavailable`    | string | `"25%"`                                           | Max unavailable for rolling update                            |
| `app.podAntiAffinity.enabled`                  | bool   | `true`                                            | Enable pod anti-affinity                                      |
| `app.securityContext.runAsUser`                | int    | `1000`                                            | User ID to run container as                                   |
| `app.securityContext.runAsGroup`               | int    | `1000`                                            | Group ID to run container as                                  |
| `app.securityContext.fsGroup`                  | int    | `1000`                                            | File system group ID for volumes                              |
| `app.securityContext.fsGroupChangePolicy`      | string | `OnRootMismatch`                                  | Volume ownership change policy                                |
| `app.securityContext.runAsNonRoot`             | bool   | `true`                                            | Require non-root user                                         |
| `app.securityContext.allowPrivilegeEscalation` | bool   | `false`                                           | Allow privilege escalation                                    |
| `app.securityContext.readOnlyRootFilesystem`   | bool   | `true`                                            | Mount root filesystem as read-only                            |
| `app.securityContext.capabilities.add`         | array  | `[]`                                              | Capabilities to add                                           |
| `app.securityContext.capabilities.drop`        | array  | `["ALL"]`                                         | Capabilities to drop                                          |
| `app.resources.requests.cpu`                   | string | `50m`                                             | CPU request                                                   |
| `app.resources.requests.memory`                | string | `64Mi`                                            | Memory request                                                |
| `app.resources.limits.cpu`                     | string | `100m`                                            | CPU limit                                                     |
| `app.resources.limits.memory`                  | string | `128Mi`                                           | Memory limit                                                  |
| `app.lifecycle`                                | object | `{}`                                              | Container lifecycle hooks (postStart, preStop)                |
| `app.healthChecks.livenessProbe`               | object | `{}`                                              | Liveness probe configuration                                  |
| `app.healthChecks.readinessProbe`              | object | `{}`                                              | Readiness probe configuration                                 |
| `app.healthChecks.startupProbe`                | object | `{}`                                              | Startup probe configuration                                   |
| `app.service.type`                             | string | `ClusterIP`                                       | Service type                                                  |
| `app.service.port`                             | int    | `80`                                              | Service port                                                  |
| `app.service.targetPort`                       | int    | `80`                                              | Service target port                                           |
| `app.service.portName`                         | string | `http`                                            | Service port name                                             |
| `app.service.extraServicePorts`                | array  | `[]`                                              | Additional service ports                                      |
| `app.volumes.emptyDir`                         | array  | `[]`                                              | EmptyDir volumes                                              |
| `app.volumes.tmpfs`                            | array  | `[]`                                              | Tmpfs volumes (RAM-based)                                     |
| `app.volumes.configMap`                        | array  | `[]`                                              | ConfigMap volumes                                             |
| `app.volumeMounts`                             | array  | `[]`                                              | Volume mounts for pod-wide storage                            |
| `storage.longhorn.enabled`                     | bool   | `false`                                           | Enable Longhorn storage                                       |
| `storage.longhorn.volumes`                     | array  | `[]`                                              | Longhorn volume configurations                                |
| `storage.smb.enabled`                          | bool   | `false`                                           | Enable SMB storage                                            |
| `storage.smb.volumes`                          | array  | `[]`                                              | SMB volume configurations                                     |
| `storage.emptyDir.enabled`                     | bool   | `false`                                           | Enable EmptyDir storage                                       |
| `storage.emptyDir.volumes`                     | array  | `[]`                                              | EmptyDir volume configurations                                |
| `secrets.enabled`                              | bool   | `true`                                            | Enable 1Password secrets integration                          |
| `secrets.itemPath`                             | string | `vaults/Secrets/items/demo-app-secrets`           | 1Password item path                                           |
| `authentik.enabled`                            | bool   | `true`                                            | Enable Authentik SSO integration                              |
| `authentik.displayName`                        | string | `Demo Application`                                | Display name in Authentik                                     |
| `authentik.externalHost`                       | string | `https://demo.gateway.services.apocrathia.com`    | External URL                                                  |
| `authentik.icon`                               | string | `https://i.imgur.com/0gNsvyk.png`                 | Icon URL                                                      |
| `authentik.openInNewTab`                       | bool   | `true`                                            | Open in new tab                                               |
| `authentik.category`                           | string | `Applications`                                    | Category in Authentik dashboard                               |
| `authentik.interceptHeaderAuth`                | bool   | `false`                                           | Enable header-based authentication                            |
| `authentik.skipPathRegex`                      | array  | `[]`                                              | Regex patterns for paths that bypass authentik authentication |
| `authentik.authorizationFlow`                  | string | `default-provider-authorization-implicit-consent` | Authorization flow                                            |
| `authentik.invalidationFlow`                   | string | `default-invalidation-flow`                       | Invalidation flow                                             |
| `authentik.authenticationFlow`                 | string | `default-authentication-flow`                     | Authentication flow                                           |
| `authentik.authentikHost`                      | string | `https://auth.gateway.services.apocrathia.com`    | Authentik server URL                                          |
| `authentik.authentikHostInsecure`              | bool   | `true`                                            | Allow insecure Authentik host                                 |
| `authentik.serviceConnection`                  | string | `Local Kubernetes Cluster`                        | Service connection name                                       |
| `authentik.replicas`                           | int    | `1`                                               | Authentik outpost replicas                                    |
| `authentik.namespace`                          | string | `authentik`                                       | Namespace for outpost                                         |
| `authentik.logLevel`                           | string | `info`                                            | Log level for outpost                                         |
| `authentik.gateway.name`                       | string | `main-gateway`                                    | Gateway name                                                  |
| `authentik.gateway.namespace`                  | string | `cilium-system`                                   | Gateway namespace                                             |
| `authentik.gateway.sectionName`                | string | `https`                                           | Gateway section name                                          |
| `httproute.enabled`                            | bool   | `false`                                           | Enable HTTPRoute (only when Authentik disabled)               |
| `httproute.hostname`                           | string | `demo.gateway.services.apocrathia.com`            | HTTPRoute hostname                                            |
| `httproute.gateway.name`                       | string | `main-gateway`                                    | Gateway name                                                  |
| `httproute.gateway.namespace`                  | string | `cilium-system`                                   | Gateway namespace                                             |
| `httproute.gateway.sectionName`                | string | `https`                                           | Gateway section name                                          |
| `tcproute.enabled`                             | bool   | `false`                                           | Enable TCPRoute                                               |
| `tcproute.routes`                              | array  | `[]`                                              | TCPRoute configurations                                       |
| `udproute.enabled`                             | bool   | `false`                                           | Enable UDPRoute                                               |
| `udproute.routes`                              | array  | `[]`                                              | UDPRoute configurations                                       |
| `loadbalancer.enabled`                         | bool   | `false`                                           | Enable LoadBalancer service                                   |
| `loadbalancer.ip`                              | string | `""`                                              | Static IP for LoadBalancer                                    |
| `loadbalancer.ports`                           | array  | `[]`                                              | LoadBalancer ports                                            |
| `loadbalancer.externalTrafficPolicy`           | string | `Local`                                           | External traffic policy (Local or Cluster)                    |
| `loadbalancer.cilium.interface`                | string | `eth0`                                            | Network interface for L2 announcements                        |
| `loadbalancer.cilium.namespace`                | string | `cilium-system`                                   | Namespace for Cilium resources                                |

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
      restartPolicy: Always
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
- **VPN Sidecars**: Run VPN containers that need to stay running alongside the main application

**restartPolicy Feature:**

The `restartPolicy` option allows init containers to stay running instead of exiting after completion. This is particularly useful for:

- **VPN Containers**: Gluetun and other VPN clients that need to maintain connections
- **Monitoring Agents**: Sidecar containers that provide ongoing monitoring or logging
- **Network Proxies**: Containers that provide network services to the main application

When `restartPolicy: Always` is set, the init container will restart if it exits, effectively making it behave like a sidecar container while retaining the init container's privileges for device access and security contexts.

#### VPN Sidecar Pattern

The init container with `restartPolicy: Always` is particularly useful for VPN sidecars. This pattern provides:

- **Device Access**: Init containers have access to TUN/TAP devices needed for VPN operations
- **Elevated Privileges**: Can run with `privileged: true` and `NET_ADMIN` capabilities
- **Persistent Connection**: Stays running alongside the main application
- **Network Isolation**: All traffic from the main container goes through the VPN

**Example VPN Sidecar Configuration:**

```yaml
app:
  initContainers:
    - name: vpn-sidecar
      image: vpn-client:latest
      restartPolicy: Always # Keep VPN container running as sidecar
      env:
        - name: VPN_PROVIDER
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: vpn-provider
        - name: VPN_USERNAME
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: vpn-username
        - name: VPN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: vpn-password
        - name: VPN_REGION
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: vpn-region
        - name: ALLOWED_PORTS
          value: "8080" # Allow app port through VPN firewall
      lifecycle:
        postStart:
          exec:
            command: ["/bin/sh", "-c", "echo 'VPN sidecar started' && sleep 5"]
        preStop:
          exec:
            command: ["/bin/sh", "-c", "echo 'VPN sidecar stopping' && sleep 2"]
      # Alternative lifecycle handlers:
      # lifecycle:
      #   postStart:
      #     httpGet:
      #       path: /health
      #       port: 8080
      #       scheme: HTTP
      #   preStop:
      #     tcpSocket:
      #       port: 8080
      # stopSignal: SIGTERM  # Custom stop signal (optional)
      securityContext:
        privileged: true
        allowPrivilegeEscalation: true
        capabilities:
          add:
            - NET_ADMIN
        readOnlyRootFilesystem: false
        runAsNonRoot: false
        runAsUser: "0"
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 200m
          memory: 256Mi
      volumes:
        emptyDir:
          - name: vpn-data
            mountPath: /vpn
```

**Key Benefits:**

- **Security**: All application traffic is routed through the VPN tunnel
- **Privacy**: IP address is masked by the VPN provider
- **Compliance**: Meets requirements for geo-restricted content access
- **Reliability**: VPN connection is maintained independently of the main application
- **Flexibility**: Easy to configure different VPN providers and regions

#### Lifecycle Hook Options

The chart supports all Kubernetes lifecycle hook types for init containers and sidecars:

**Handler Types:**

- **exec**: Execute commands inside the container

  ```yaml
  lifecycle:
    postStart:
      exec:
        command: ["/bin/sh", "-c", "echo 'Container started'"]
  ```

- **httpGet**: Perform HTTP health checks

  ```yaml
  lifecycle:
    postStart:
      httpGet:
        path: /health
        port: 8080
        scheme: HTTP
        httpHeaders:
          - name: Custom-Header
            value: "value"
  ```

- **tcpSocket**: Check if a TCP port is open
  ```yaml
  lifecycle:
    preStop:
      tcpSocket:
        port: 8080
  ```

**Stop Signal:**

- **stopSignal**: Custom signal sent to container on termination
  ```yaml
  stopSignal: SIGTERM # Default signal sent to container
  ```

**Common Use Cases:**

- **postStart**: Initialize services, wait for dependencies, perform health checks
- **preStop**: Graceful shutdown, cleanup resources, notify other services
- **stopSignal**: Handle containers that expect specific termination signals

### Health Check Probes

The chart supports optional health check probes (liveness, readiness, and startup) for both main containers and sidecars. Probes are opt-in and disabled by default, ensuring no impact on existing deployments.

**Configuration:**

```yaml
app:
  healthChecks:
    livenessProbe:
      enabled: true
      httpGet:
        path: /health
        port: 80
        scheme: HTTP
        httpHeaders:
          - name: Custom-Header
            value: "value"
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
      successThreshold: 1
    readinessProbe:
      enabled: true
      httpGet:
        path: /ready
        port: 80
        scheme: HTTP
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 3
      successThreshold: 1
    startupProbe:
      enabled: true
      httpGet:
        path: /health
        port: 80
        scheme: HTTP
      initialDelaySeconds: 10
      periodSeconds: 10
      timeoutSeconds: 3
      failureThreshold: 30
      successThreshold: 1
```

**Probe Types:**

- **httpGet**: HTTP health check endpoint

  ```yaml
  healthChecks:
    livenessProbe:
      enabled: true
      httpGet:
        path: /health
        port: 80
        scheme: HTTP
        httpHeaders:
          - name: Authorization
            value: "Bearer token"
  ```

- **exec**: Execute commands inside the container

  ```yaml
  healthChecks:
    livenessProbe:
      enabled: true
      exec:
        command:
          - /bin/sh
          - -c
          - "test -f /tmp/healthy"
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
      successThreshold: 1
  ```

- **tcpSocket**: Check if a TCP port is open

  ```yaml
  healthChecks:
    livenessProbe:
      enabled: true
      tcpSocket:
        port: 80
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
      successThreshold: 1
  ```

**Probe Configuration Fields:**

- `initialDelaySeconds`: Delay before first probe (default: 0)
- `periodSeconds`: How often to perform the probe (default: 10)
- `timeoutSeconds`: Probe timeout (default: 1)
- `failureThreshold`: Number of failures before marking unhealthy (default: 3)
- `successThreshold`: Number of successes required after failure (default: 1)

**Sidecar Health Checks:**

Health checks can also be configured for sidecar containers:

```yaml
app:
  sidecars:
    - name: nginx-sidecar
      image: nginx:alpine
      healthChecks:
        livenessProbe:
          enabled: true
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
          successThreshold: 1
        readinessProbe:
          enabled: true
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
          successThreshold: 1
```

**Common Use Cases:**

- **Liveness Probe**: Detects if container is alive and restart if unhealthy
- **Readiness Probe**: Detects if container is ready to receive traffic
- **Startup Probe**: Allows slow-starting containers additional time before liveness/readiness probes take over

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
  # Configure unauthenticated paths (regex patterns)
  # Paths matching these patterns will bypass authentik authentication
  skipPathRegex:
    - "^/$"
    - "^/.well-known/"
    - "^/api/"
    - "^/v1/"
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
  # Configure unauthenticated paths (regex patterns)
  # Paths matching these patterns will bypass authentik authentication
  skipPathRegex:
    - "^/$"
    - "^/.well-known/"
    - "^/api/"
```

#### Authentik Configuration Options

- `enabled`: Enable/disable Authentik SSO integration
- `displayName`: Display name for the application in Authentik
- `externalHost`: External URL for the application
- `icon`: Icon URL for the application (optional)
- `openInNewTab`: Open application in new tab (default: true)
- `category`: Category for organizing applications in Authentik dashboard (default: "Applications")
  - Common categories: `Applications`, `Infrastructure`, `External`
- `interceptHeaderAuth`: Enable header-based authentication for reverse proxy auth (default: false)
  - Set to `true` for applications like Grocy that use reverse proxy authentication
  - When enabled, Authentik will pass user information via headers
- `skipPathRegex`: List of regex patterns for paths that bypass authentik authentication (default: [])
  - Paths matching these patterns will be accessible without authentication
  - Useful for API endpoints, health checks, or public resources
  - Example: `["^/$", "^/.well-known/", "^/api/"]`

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
