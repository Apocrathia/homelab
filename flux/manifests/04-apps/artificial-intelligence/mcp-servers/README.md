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
- **Unified Gateway**: All servers accessible through `mcp.gateway.services.apocrathia.com`

## Current MCP Servers

### OSV Vulnerability Scanner

- **Hostname**: `https://mcp.gateway.services.apocrathia.com/osv`
- **Purpose**: Query the Open Source Vulnerability database for security vulnerabilities
- **Available Tools**: Vulnerability queries, batch scanning, detailed vulnerability information
- **Network Access**: Required for OSV database queries

### GoFetch Web Content Server

- **Hostname**: `https://mcp.gateway.services.apocrathia.com/gofetch`
- **Purpose**: Retrieve and process web content from URLs
- **Available Tools**: Web content fetching, markdown conversion, content extraction
- **Network Access**: Required for web content retrieval

### MKP Kubernetes Server

- **Hostname**: `https://mcp.gateway.services.apocrathia.com/mkp`
- **Purpose**: Direct Kubernetes cluster access and management
- **Available Tools**: Resource listing, getting, applying, and pod execution
- **Network Access**: Required for Kubernetes API communication

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
- **Gateway Integration**: Use unified hostname with server-specific paths

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
