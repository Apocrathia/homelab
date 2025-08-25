# MCP Servers

MCP servers provide specialized functionality through the Model Context Protocol for integration with MCP-compatible clients.

## Documentation

- [ToolHive Documentation](https://docs.stacklok.com/toolhive/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)

## Overview

This directory contains MCP server deployments managed by the ToolHive operator:

- **ToolHive Operator**: Automates MCP server deployment and lifecycle management
- **Gateway API Integration**: HTTPS exposure with TLS termination
- **Security Isolation**: Each server runs in its own namespace with minimal permissions

## Current MCP Servers

### OSV Vulnerability Scanner

- **Hostname**: `https://osv.apocrathia.com`
- **Purpose**: Query the Open Source Vulnerability database
- **Network Access**: Required for database queries

## Adding New MCP Servers

Create new server directories under `mcp-servers/` with the following structure:

```
<server-name>/
├── namespace.yaml          # Namespace definition
├── mcpserver.yaml          # MCPServer custom resource
├── httproute.yaml          # Gateway API route
├── kustomization.yaml      # Kustomize configuration
└── README.md              # Documentation
```

### Best Practices

- **Resource Limits**: Set conservative limits for homelab environment
- **Network Permissions**: Use minimal required permissions
- **Security**: Consider authentication for sensitive functionality

## Monitoring and Management

```bash
# View all MCP servers
kubectl get mcpservers --all-namespaces

# Check specific server
kubectl get mcpserver <name> -n <namespace>

# Check operator status
kubectl get pods -n toolhive-system
```

## Security Considerations

- **Network Isolation**: Each server runs in its own namespace
- **Minimal Permissions**: ToolHive operator creates least-privilege RBAC
- **Authentication**: Consider adding for sensitive functionality
