# Configuration Reference

This document provides a central reference for common configuration patterns used throughout the homelab repository.

## Domain Patterns

The overall pattern is `[app].[host].[network].[domain].[tld]`.

### Gateway Services

- **Pattern**: `https://[app-name].gateway.services.apocrathia.com`
- **Purpose**: External access to applications through Authentik proxy
- **Examples**:
  - `https://chat.gateway.services.apocrathia.com` (OpenWebUI)
  - `https://n8n.gateway.services.apocrathia.com` (n8n)

### Storage Services

- **Pattern**: `//storage.services.apocrathia.com/[path]`
- **Purpose**: SMB network storage access
- **Examples**:
  - `//storage.services.apocrathia.com/Video/Movies`
  - `//storage.services.apocrathia.com/Video/TV`

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
  - `vaults/Secrets/items/litellm-secrets`

### Common Secret Fields

- **Database Credentials**:
  - `username`: Database username
  - `password`: Database password
- **Application-Specific Keys**: Field names vary by app (e.g., `master-key`, `api-key`, `secret-key`)

## Storage Patterns

### Longhorn Volumes

- **Purpose**: Persistent application data
- **Pattern**: Longhorn is the default StorageClass; explicit `storageClassName: longhorn` used when needed
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

- **Pattern**: Authentik proxy provider with dedicated outpost per application
- **HTTPRoute**: Disabled (Authentik outpost manages Gateway API routes via `kubernetes_httproute_parent_refs`)
- **Authentication**: Proxy-based authentication with optional header injection for apps that support it

### Blueprint Integration

- **Pattern**: `authentik-blueprint.yaml` files in application directories, loaded via Kustomize configMapGenerator
- **Purpose**: Declarative Authentik configuration (providers, applications, outposts)
- **Components**: Proxy provider, application entry, outpost with Gateway API integration

## Database Patterns

### CloudNativePG Integration

- **Pattern**: PostgreSQL clusters managed by CloudNativePG operator
- **Connection**: `[cluster-name]-rw.[namespace].svc.cluster.local:5432`
- **Credentials**: Managed through 1Password secrets
- **Storage**: Longhorn volumes for data persistence

### Common Database Configurations

- **Max Connections**: 100-200 for most apps (up to 400 for high-traffic services like Authentik)
- **Logging**: DDL statements (`log_statement: ddl`), slow queries (`log_min_duration_statement: 1000ms`)
- **Monitoring**: PodMonitor for Postgres metrics collection

## Security Patterns

### LinuxServer.io Containers

- **Security Context**: Root-initiated with PUID/PGID switching
- **Required Capabilities**: SETUID, SETGID, CHOWN, DAC_OVERRIDE
- **Filesystem**: Writable root filesystem for compatibility

### Network Policies

- **Pattern**: `CiliumClusterwideNetworkPolicy` for cross-namespace isolation
- **Current Usage**: MCP server isolation (restricts access to authorized namespaces)
- **Scope**: Namespace-level restrictions via label selectors

## Resource Patterns

### CPU/Memory Limits

- **Light Applications**: 50m-200m CPU, 128Mi-512Mi memory
- **Medium Applications**: 100m-500m CPU, 256Mi-1Gi memory
- **Heavy Applications**: 300m-2000m CPU, 512Mi-4Gi memory

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
