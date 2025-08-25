# GoFetch MCP Server

The GoFetch MCP server provides web content retrieval capabilities through the Model Context Protocol. This is the Go implementation of the Fetch server, which retrieves and processes content from web pages.

> **Note**: This is the Go implementation. There's also a Python implementation available at [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers/tree/main/src/fetch).

## Why GoFetch?

The GoFetch implementation provides several advantages over the Python version:

- **Lower Memory Usage**: More efficient resource utilization
- **Faster Startup/Shutdown**: Quick deployment and scaling
- **Single Binary**: Easier deployment and better security
- **Better Concurrency**: Improved handling of concurrent requests
- **Container Security**: Distroless images, non-root user, container signing
- **StreamableHTTP Transport**: Modern transport protocol instead of STDIO

## Documentation

- [ToolHive Documentation](https://docs.stacklok.com/toolhive/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [GoFetch Source Repository](https://github.com/StacklokLabs/gofetch)

## Overview

This deployment includes:

- GoFetch MCP server for web content retrieval and processing
- ToolHive proxy for secure communication
- Gateway API exposure at `https://mcp.gateway.services.apocrathia.com/gofetch`
- Network permission profile for web access

## Configuration

## MCP Client Configuration

### Cursor IDE

Add the following configuration to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "gofetch": {
      "url": "https://mcp.gateway.services.apocrathia.com/gofetch"
    }
  }
}
```

### Other MCP Clients

For other MCP-compatible clients, use this server configuration:

- **Server URL**: `https://mcp.gateway.services.apocrathia.com/gofetch`
- **Transport**: HTTP POST with JSON-RPC
- **Authentication**: None (currently open)

### Testing the Connection

You can test the MCP server connection:

```bash
# Initialize MCP connection (recommended test)
curl -k -X POST -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' \
  https://mcp.gateway.services.apocrathia.com/gofetch

# Should return server info and capabilities

# List available tools
curl -k -X POST -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  https://mcp.gateway.services.apocrathia.com/gofetch
```

### Available MCP Tools

The GoFetch MCP server provides web content retrieval tools:

1. **fetch**
   - Retrieve and process web content from URLs
   - **Input**: `{"url": "https://example.com", "max_length": 5000, "start_index": 0, "raw": false}`
   - **Parameters**:
     - `url` (required): The URL to fetch
     - `max_length` (optional): Maximum characters to return (default: 5000, max: 1000000)
     - `start_index` (optional): Starting character index (default: 0)
     - `raw` (optional): Return raw HTML instead of markdown (default: false)

### Example Usage

```bash
# Fetch web content as markdown (default)
curl -k -X POST -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"fetch","arguments":{"url":"https://example.com","max_length":5000}}}' \
  https://mcp.gateway.services.apocrathia.com/gofetch

# Fetch raw HTML content
curl -k -X POST -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"fetch","arguments":{"url":"https://example.com","raw":true}}}' \
  https://mcp.gateway.services.apocrathia.com/gofetch
```
