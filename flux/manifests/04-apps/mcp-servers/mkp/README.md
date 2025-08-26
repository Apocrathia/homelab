# MKP Kubernetes MCP Server

The MKP MCP server provides direct Kubernetes cluster access through the Model Context Protocol.

## Documentation

- [MKP Source Repository](https://github.com/StacklokLabs/mkp)
- [MCP Specification](https://spec.modelcontextprotocol.io/)

## Overview

This deployment includes:

- MKP MCP server for Kubernetes cluster interaction
- ToolHive proxy for secure communication
- Gateway API exposure at `https://mcp.gateway.services.apocrathia.com/mkp`
- Network permission profile for cluster access
- In-cluster Kubernetes authentication

## Configuration

### Resources

- **CPU**: 100m requests, 200m limits
- **Memory**: 128Mi requests, 256Mi limits
- **Network Access**: Required for Kubernetes API communication

### Security

- **Permission Profile**: Network access for cluster operations
- **Cluster Access**: Uses in-cluster service account for authentication
- **Read-Only Mode**: Default operation (write operations disabled)
- **Security Note**: This is an unauthenticated endpoint with minimal read-only access to non-sensitive resources only

## MCP Client Configuration

### Cursor IDE

Add the following configuration to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "kubernetes-mcp": {
      "url": "https://mcp.gateway.services.apocrathia.com/mkp"
    }
  }
}
```

### Other MCP Clients

For other MCP-compatible clients, use this server configuration:

- **Server URL**: `https://mcp.gateway.services.apocrathia.com/mkp`
- **Transport**: HTTP POST with JSON-RPC
- **Authentication**: Uses in-cluster service account for cluster access

### Testing the Connection

You can test the MCP server connection:

```bash
# Initialize MCP connection (recommended test)
curl -k -X POST -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' \
  https://mcp.gateway.services.apocrathia.com/mkp

# Should return server info and capabilities

# List available tools
curl -k -X POST -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  https://mcp.gateway.services.apocrathia.com/mkp
```

### Available MCP Tools

The MKP server provides these Kubernetes tools:

1. **get_resource**

   - Get Kubernetes resources and subresources
   - **Input**: `{"resource_type": "namespaced", "group": "apps", "version": "v1", "resource": "deployments", "namespace": "default", "name": "nginx-deployment"}`

2. **list_resources**

   - List Kubernetes resources of a specific type
   - **Input**: `{"resource_type": "namespaced", "group": "apps", "version": "v1", "resource": "deployments", "namespace": "default"}`

3. **apply_resource**

   - Create or update Kubernetes resources
   - **Input**: `{"resource_type": "namespaced", "group": "apps", "version": "v1", "resource": "deployments", "namespace": "default", "manifest": {...}}`

4. **post_resource**
   - Execute commands in pods or interact with subresources
   - **Input**: `{"resource_type": "namespaced", "group": "", "version": "v1", "resource": "pods", "namespace": "default", "name": "my-pod", "subresource": "exec", "body": {"command": ["ls", "-la"]}}`

### Example Usage

```bash
# List all deployments in default namespace
curl -k -X POST -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_resources","arguments":{"resource_type":"namespaced","group":"apps","version":"v1","resource":"deployments","namespace":"default"}}}' \
  https://mcp.gateway.services.apocrathia.com/mkp
```
