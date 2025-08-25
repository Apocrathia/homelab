# ToolHive Kubernetes Operator

This directory contains the deployment configuration for the ToolHive Kubernetes operator, which manages MCP (Model Context Protocol) servers in Kubernetes clusters.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

The ToolHive operator automates the deployment and management of MCP servers in Kubernetes by providing:

- **Custom Resources**: `MCPServer` custom resource for defining MCP server configurations
- **Automated Deployment**: Automatic creation of Deployments, Services, and RBAC resources
- **Proxy Architecture**: Secure proxy-based communication with MCP servers
- **Multiple Transports**: Support for stdio, streamable-http, and SSE transports
- **Permission Profiles**: Built-in and custom permission profiles for security

> **Note**: This is experimental software under active development. CRDs are in alpha state and breaking changes are possible.

## Architecture

### Core Components

#### ToolHive Operator

- **Custom Resource Management**: Manages `MCPServer` resources
- **RBAC Automation**: Automatically creates ServiceAccounts, Roles, and RoleBindings
- **Lifecycle Management**: Handles deployment, scaling, and cleanup of MCP servers

#### Proxy Pods

- **Security Isolation**: Each MCP server runs in its own proxy container
- **Transport Handling**: Manages different MCP transport protocols
- **Service Discovery**: Provides consistent service endpoints for MCP servers

### Custom Resources

#### MCPServer

- **Container Configuration**: Standard Kubernetes container specs
- **Transport Selection**: Choose between stdio, streamable-http, or SSE
- **Resource Management**: CPU and memory limits and requests
- **Secret Integration**: Mount secrets for authentication
- **Volume Mounting**: Persistent storage support
- **Permission Profiles**: Built-in security profiles

## Installation

The operator is deployed in cluster mode with the following components:

1. **CRDs**: Custom Resource Definitions for `MCPServer` resources
2. **Operator**: Controller that manages MCP server lifecycle
3. **RBAC**: Cluster-wide permissions for managing MCP servers

## Configuration

### Deployment Mode

This installation uses **cluster mode** which provides:

- Full cluster-wide access to manage MCPServers in any namespace
- Simplified configuration and management
- Best for homelab environments

### Resource Limits

The operator is configured with minimal resource requirements:

- **CPU**: 50m requests, 100m limits
- **Memory**: 64Mi requests, 128Mi limits

## Example MCPServer

```yaml
apiVersion: toolhive.stacklok.dev/v1alpha1
kind: MCPServer
metadata:
  name: example-server
  namespace: default
spec:
  image: ghcr.io/example/mcp-server
  transport: streamable-http
  port: 8080
  permissionProfile:
    type: builtin
    name: network
  resources:
    limits:
      cpu: "100m"
      memory: "128Mi"
    requests:
      cpu: "50m"
      memory: "64Mi"
```

## Status and Monitoring

### Check Operator Status

```bash
# Check operator deployment
kubectl get deployment -n toolhive-system

# Check operator pods
kubectl get pods -n toolhive-system

# View operator logs
kubectl logs -n toolhive-system deployment/toolhive-operator
```

### Check MCPServer Status

```bash
# List all MCPServers
kubectl get mcpservers --all-namespaces

# Get specific server details
kubectl describe mcpserver <server-name> -n <namespace>

# Check server URL
kubectl get mcpserver <server-name> -n <namespace> -o jsonpath='{.status.url}'
```

## Security Considerations

### Permission Profiles

The operator supports built-in permission profiles:

- **none**: No network access
- **network**: Full network access (use with caution)

Custom permission profiles can be defined using ConfigMaps for fine-grained access control.

### RBAC

Each MCPServer gets its own ServiceAccount with minimal required permissions:

- Deployment management
- Service management
- Pod lifecycle operations

### Network Security

- MCP servers are isolated in their own proxy containers
- Service-to-service communication is secured
- Network policies can be applied for additional security

## Troubleshooting

### Common Issues

1. **MCPServer Not Creating**

   ```bash
   # Check operator logs
   kubectl logs -n toolhive-system deployment/toolhive-operator

   # Verify CRDs are installed
   kubectl get crd | grep toolhive
   ```

2. **Pod Creation Failures**

   ```bash
   # Check pod status
   kubectl get pods -n <namespace> -l app.kubernetes.io/instance=<server-name>

   # Describe the pod
   kubectl describe pod <pod-name> -n <namespace>

   # Check pod logs
   kubectl logs <pod-name> -n <namespace> -c mcp
   ```

3. **Permission Issues**

   ```bash
   # Check RBAC resources
   kubectl get serviceaccount -n <namespace> -l app.kubernetes.io/instance=<server-name>

   # Check role bindings
   kubectl get rolebinding -n <namespace> -l app.kubernetes.io/instance=<server-name>
   ```

### Debug Commands

```bash
# Get all resources for an MCPServer
kubectl get all -n <namespace> -l app.kubernetes.io/instance=<server-name>

# Check operator events
kubectl get events -n toolhive-system --sort-by='.lastTimestamp'

# Export MCPServer for inspection
kubectl get mcpserver <server-name> -n <namespace> -o yaml
```

## Best Practices

### MCP Server Management

1. **Resource Limits**: Set appropriate CPU and memory limits
2. **Image Security**: Use trusted container images
3. **Secret Management**: Store sensitive data in Kubernetes secrets
4. **Permission Profiles**: Use minimal permission profiles

### Operations

1. **Monitoring**: Monitor MCP server health and resource usage
2. **Updates**: Keep MCP server images updated
3. **Backup**: Backup MCPServer configurations
4. **Documentation**: Document custom MCP server configurations

## External Resources

- [ToolHive Documentation](https://docs.stacklok.com/toolhive/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Kubernetes CRD Reference](https://docs.stacklok.com/toolhive/reference/crd-spec)
