# MCP Servers

Model Context Protocol servers providing specialized functionality for MCP-compatible clients.

> **Navigation**: [← Back to AI README](../README.md)

## Documentation

- **[ToolHive Documentation](https://docs.stacklok.com/toolhive/)** - Primary documentation source
- **[MCP Specification](https://spec.modelcontextprotocol.io/)** - Protocol specification

## Overview

This deployment includes:

- ToolHive operator for MCP server lifecycle management
- Multiple specialized MCP servers for different functions
- Gateway API integration with unified HTTPS access
- Security isolation with namespace-based deployment

## Configuration

### Current MCP Servers

#### OSV Vulnerability Scanner

- **Purpose**: Query Open Source Vulnerability database for security vulnerabilities
- **Tools**: Vulnerability queries, batch scanning, detailed vulnerability information
- **Access**: `https://mcp.gateway.services.apocrathia.com/osv`

#### GoFetch Web Content Server

- **Purpose**: Retrieve and process web content from URLs
- **Tools**: Web content fetching, markdown conversion, content extraction
- **Access**: `https://mcp.gateway.services.apocrathia.com/gofetch`

#### MKP Kubernetes Server

- **Purpose**: Direct Kubernetes cluster access and management
- **Tools**: Resource listing, getting, applying, and pod execution
- **Access**: `https://mcp.gateway.services.apocrathia.com/mkp`

#### Grafana MCP Server

- **Purpose**: Grafana dashboard and data source management
- **Tools**: Dashboard operations, Prometheus queries, Loki log analysis, alert management
- **Access**: `https://mcp.gateway.services.apocrathia.com/grafana`

### Access

- **Unified Gateway**: All servers accessible through `https://mcp.gateway.services.apocrathia.com`
- **Server-specific Paths**: Each server has its own path (e.g., `/osv`, `/gofetch`)

## Security Considerations

- **Network Isolation**: Each server runs in its own namespace
- **Minimal Permissions**: ToolHive operator creates least-privilege RBAC
- **Gateway Integration**: Unified HTTPS access with TLS termination
- **Authentication**: Consider adding for sensitive functionality

## Troubleshooting

### Common Issues

1. **Server Deployment Issues**

   ```bash
   # View all MCP servers
   kubectl get mcpservers --all-namespaces

   # Check specific server
   kubectl get mcpserver <name> -n <namespace>

   # Check operator status
   kubectl get pods -n toolhive-system
   ```

2. **Gateway Access Issues**

   ```bash
   # Check HTTPRoute configuration
   kubectl get httproute -n <server-namespace>

   # Check Gateway status
   kubectl get gateway -n cilium-system
   ```

### Health Checks

```bash
# Check ToolHive operator
kubectl -n toolhive-system get pods

# Check MCP server deployments
kubectl get mcpservers --all-namespaces

# Check Gateway API resources
kubectl get httproute --all-namespaces
```
