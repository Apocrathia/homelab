# Configuration Reference

This document provides a central reference for common configuration patterns used throughout the homelab repository.

## Domain Patterns

The overall pattern is `[app].[host].[network].[domain].[tld]`.

### Gateway Services

- **Pattern**: `https://[app-name].gateway.services.apocrathia.com`
- **Purpose**: External access to applications through Authentik proxy
- **Examples**:
  - `https://chat.gateway.services.apocrathia.com` (OpenWebUI)
  - `https://mlflow.gateway.services.apocrathia.com` (MLflow)
  - `https://n8n.gateway.services.apocrathia.com` (n8n)

### Storage Services

- **Pattern**: `//storage.services.apocrathia.com/[path]`
- **Purpose**: SMB network storage access
- **Examples**:
  - `//storage.services.apocrathia.com/Video/Movies`
  - `//storage.services.apocrathia.com/Library/Sites/Demo`

### Internal Services

- **Pattern**: `http://[service-name].[namespace].svc.cluster.local:[port]`
- **Purpose**: Internal cluster communication
- **Examples**:
  - `http://n8n-postgres-rw.n8n.svc.cluster.local:5432`
  - `http://mlflow.mlflow.svc.cluster.local:5000`

## 1Password Integration Patterns

### Secret Item Paths

- **Pattern**: `vaults/[vault-name]/items/[app-name]-secrets`
- **Purpose**: Standardized secret storage location
- **Examples**:
  - `vaults/Secrets/items/n8n-secrets`
  - `vaults/Secrets/items/mlflow-secrets`
  - `vaults/Secrets/items/litellm-secrets`

### Common Secret Fields

- **Database Credentials**:
  - `username`: Database username
  - `password`: Database password
- **API Keys**:
  - `api-key`: External API access key
  - `master-key`: Application master key
- **OAuth Configuration**:
  - `oauth-client-id`: OAuth client identifier
  - `oauth-client-secret`: OAuth client secret

## Storage Patterns

### Longhorn Volumes

- **Purpose**: Persistent application data
- **Pattern**: `storageClassName: longhorn`
- **Common Sizes**: 10Gi, 20Gi, 50Gi
- **Usage**: Configuration files, databases, application data

### SMB Volumes

- **Purpose**: Shared network storage access
- **Pattern**: CSI SMB driver with credentials
- **Usage**: Media libraries, shared content, scratch directories
- **Credentials**: `vaults/Secrets/items/smb-credentials`

### EmptyDir Volumes

- **Purpose**: Temporary, pod-scoped storage
- **Pattern**: `emptyDir: {}`
- **Usage**: Cache directories, temporary files, runtime data

## Authentik Integration Patterns

### Proxy Provider Configuration

- **Pattern**: Authentik proxy provider with outpost
- **HTTPRoute**: Disabled (Authentik manages routing)
- **Authentication**: Trusted header authentication
- **Headers**: `X-Forwarded-Email`, `X-Forwarded-User`

### Blueprint Integration

- **Pattern**: `authentik-blueprint.yaml` with Kustomize config generator
- **Purpose**: Automated user/group management
- **Configuration**: Display name, icon, external host

## Database Patterns

### CloudNativePG Integration

- **Pattern**: PostgreSQL clusters managed by CloudNativePG operator
- **Connection**: `[cluster-name]-rw.[namespace].svc.cluster.local:5432`
- **Credentials**: Managed through 1Password secrets
- **Storage**: Longhorn volumes for data persistence

### Common Database Configurations

- **Max Connections**: 100-200 (depending on workload)
- **Logging**: DDL statements, slow queries (>1s)
- **Monitoring**: PodMonitor integration enabled

## Security Patterns

### LinuxServer.io Containers

- **Security Context**: Root-initiated with PUID/PGID switching
- **Required Capabilities**: SETUID, SETGID, CHOWN, DAC_OVERRIDE
- **Filesystem**: Writable root filesystem for compatibility

### Network Policies

- **Pattern**: Cilium NetworkPolicy resources
- **Purpose**: Fine-grained traffic control
- **Common Rules**: Allow application-to-database communication

## Resource Patterns

### CPU/Memory Limits

- **Light Applications**: 100m-500m CPU, 256Mi-1Gi memory
- **Medium Applications**: 200m-1000m CPU, 512Mi-2Gi memory
- **Heavy Applications**: 500m-4000m CPU, 1-8Gi memory

### HPA Configuration

- **Pattern**: HorizontalPodAutoscaler for scaling
- **Common Metrics**: CPU utilization, memory utilization
- **Scaling Range**: 2-5 replicas typical

## Troubleshooting Patterns

### Common Commands

```bash
# Check deployment status
kubectl -n [namespace] get pods,svc,pvc

# View logs
kubectl -n [namespace] logs -l [selector]

# Check secrets
kubectl -n [namespace] get secret [secret-name]

# Port forward for testing
kubectl -n [namespace] port-forward svc/[service-name] [local-port]:[service-port]
```

### Health Check Patterns

- **Readiness Probes**: HTTP GET on health endpoints
- **Liveness Probes**: HTTP GET or command execution
- **Startup Probes**: For slow-starting applications

## Update Guidelines

When updating this reference:

1. **Add New Patterns**: Document new configuration patterns as they emerge
2. **Update Examples**: Keep examples current with actual usage
3. **Version References**: Avoid hardcoded versions, focus on patterns
4. **Cross-Reference**: Link to specific READMEs for detailed examples
