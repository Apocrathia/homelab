# OSV Vulnerability Scanner MCP Server

The OSV MCP server provides vulnerability scanning capabilities through the Model Context Protocol.

## Documentation

- [OSV Database](https://osv.dev/) - Open Source Vulnerability database
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation

## Overview

This deployment includes:

- OSV MCP server for vulnerability database queries
- ToolHive proxy for secure communication
- Gateway API exposure at `https://mcp.gateway.services.apocrathia.com/osv`
- Network permission profile for database access

## Configuration

### Resources

- **CPU**: 50m requests, 200m limits
- **Memory**: 128Mi requests, 256Mi limits
- **Network Access**: Required for OSV database queries

### Security

- **Permission Profile**: Network access for database queries
- **Authentication**: Currently open for ease of use

## MCP Client Configuration

### Cursor IDE

Add the following configuration to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "osv-vulnerability-scanner": {
      "url": "https://mcp.gateway.services.apocrathia.com/osv"
    }
  }
}
```

### Other MCP Clients

For other MCP-compatible clients, use this server configuration:

- **Server URL**: `https://mcp.gateway.services.apocrathia.com/osv`
- **Transport**: HTTP POST with JSON-RPC
- **Authentication**: None (currently open)

### Testing the Connection

You can test the MCP server connection:

```bash
# Initialize MCP connection (recommended test)
curl -k -X POST -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' \
  https://mcp.gateway.services.apocrathia.com/osv

# Should return server info and capabilities

# List available tools
curl -k -X POST -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  https://mcp.gateway.services.apocrathia.com/osv
```

### Available MCP Tools

The OSV MCP server provides these tools:

1. **query_vulnerability**

   - Query for vulnerabilities affecting a specific package version or commit
   - **Input**: `{"package_name": "lodash", "ecosystem": "npm", "version": "4.17.15"}`
   - **Alternative**: `{"commit": "abc123..."}` or `{"purl": "pkg:npm/lodash@4.17.15"}`

2. **query_vulnerabilities_batch**

   - Query for vulnerabilities affecting multiple packages or commits at once
   - **Input**: `{"queries": [{"package_name": "lodash", "ecosystem": "npm", "version": "4.17.15"}]}`

3. **get_vulnerability**
   - Get detailed information about a specific vulnerability by OSV ID
   - **Input**: `{"id": "GHSA-vqj2-4v8m-8vrq"}`
