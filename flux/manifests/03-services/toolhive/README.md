# ToolHive Kubernetes Operator

The ToolHive operator manages MCP (Model Context Protocol) servers in Kubernetes clusters.

> **Navigation**: [← Back to Services README](../README.md)

## Documentation

- **[ToolHive Documentation](https://docs.stacklok.com/toolhive/)** - Primary documentation source
- **[GitHub Repository](https://github.com/stacklok/toolhive)** - Source code and issues

## Overview

This deployment includes:

- ToolHive operator with cluster-wide permissions
- CRDs for MCPServer custom resources
- Automated MCP server lifecycle management
- Proxy-based architecture for secure communication

## Configuration

### Deployment Mode

**Cluster-wide deployment** with the following characteristics:

- Full cluster-wide access to manage MCPServers in any namespace
- Simplified configuration and management
- Best for homelab environments

### Resource Limits

- **CPU**: 50m requests, 100m limits
- **Memory**: 64Mi requests, 128Mi limits

## Security Considerations

### Permission Profiles

Built-in permission profiles:

- **none**: No network access
- **network**: Full network access (use with caution)

### RBAC

Each MCPServer gets minimal required permissions:

- ServiceAccount with namespace-scoped access
- Deployment and service management
- Pod lifecycle operations

> **Note**: This is experimental software under active development. CRDs are in alpha state and breaking changes are possible.
