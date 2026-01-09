# MCPO Bridge for Open WebUI

MCPO (MCP-to-OpenAPI) bridge that enables Open WebUI to connect to MCP servers through OpenAPI endpoints.

> **Navigation**: [← Back to OpenWebUI README](../README.md)

## Documentation

- **[MCPO GitHub](https://github.com/modelcontextprotocol/mcpo)** - Source code and documentation
- **[MCP Specification](https://spec.modelcontextprotocol.io/)** - Model Context Protocol specification

## Overview

The MCPO bridge acts as a translation layer between Open WebUI and the existing MCP servers managed by ToolHive. It exposes all MCP server tools as individual OpenAPI endpoints that Open WebUI can consume.

## Configuration

The MCPO configuration uses a static ConfigMap with hot-reload enabled:

1. **Static ConfigMap**: Contains the MCP server configuration in JSON format
2. **Hot-Reload**: MCPO watches the config file for changes and automatically reloads
3. **Generic App Chart**: Uses the homelab generic-app Helm chart for consistent deployment

### Connected MCP Servers

The bridge connects to the configured MCP servers with `streamable-http` transport:

- **OSV**: `https://mcp.gateway.services.apocrathia.com/osv`
- **GoFetch**: `https://mcp.gateway.services.apocrathia.com/gofetch`
- **MKP**: `https://mcp.gateway.services.apocrathia.com/mkp`
- **Grafana**: `https://mcp.gateway.services.apocrathia.com/grafana`

### Access Points

- **Internal**: `http://mcpo-bridge.openwebui.svc.cluster.local:8000`
- **External**: `https://mcpo.gateway.services.apocrathia.com`
- **Documentation**: `https://mcpo.gateway.services.apocrathia.com/docs`

## Security

- **No External Access**: Only accessible internally
- **No Authentication**: Direct access without API keys for Open WebUI integration

## Usage in Open WebUI

### Configuration Steps

1. **Navigate to Tool Server Settings**:

   - Go to **Admin Settings > Tools** (for administrators)
   - Or **Settings > Tools** (for users with permissions)

2. **Add MCPO Tool Server**:

   - Click **"Add Connection"** or **"Manage Tool Servers"**
   - Enter the following details:
     - **URL**: `http://mcpo-bridge.openwebui.svc.cluster.local:8000`
     - **Path**: `/openapi.json` (or leave empty for auto-discovery)
     - **Authentication**: None (or select appropriate method if configured)

3. **Verify Connection**:

   - Use the **"Verify"** option to test the connection
   - Ensure Open WebUI can access the OpenAPI specification

4. **Save and Enable**:
   - Save the configuration
   - Enable desired tools from the available MCP servers

## Troubleshooting

```bash
# Pod status
kubectl get pods -n openwebui -l app.kubernetes.io/name=mcpo-bridge

# MCPO logs
kubectl logs -n openwebui deployment/mcpo-bridge -f

# Test OpenAPI endpoint
kubectl exec -n openwebui deployment/mcpo-bridge -- curl -s localhost:8000/openapi.json | head -20
```
