# SearXNG MCP Server

The SearXNG MCP server provides web search capabilities through the Model Context Protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Documentation

- [SearXNG](https://docs.searxng.org/) - Privacy-respecting metasearch engine
- [mcp-searxng](https://github.com/ihor-sokoliuk/mcp-searxng) - MCP server repository
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation

## Overview

This deployment includes:

- SearXNG MCP server for web search queries
- ToolHive proxy for secure communication
- Gateway API exposure at `https://mcp.gateway.services.apocrathia.com/searxng`
- Connection to internal SearXNG instance

## Configuration

### Environment Variables

| Variable        | Value                                           | Description               |
| --------------- | ----------------------------------------------- | ------------------------- |
| `SEARXNG_URL`   | `http://searxng.searxng.svc.cluster.local:8080` | Internal SearXNG instance |
| `MCP_HTTP_PORT` | `8080`                                          | HTTP transport port       |

### Resources

- **CPU**: 100m requests, 200m limits
- **Memory**: 128Mi requests, 256Mi limits
- **Network Access**: Required for SearXNG queries

### Security

- **Permission Profile**: Network access for search queries
- **Authentication**: None required

## MCP Client Configuration

### Via LiteLLM Gateway

The server is accessible through the LiteLLM MCP gateway:

```json
{
  "mcpServers": {
    "litellm": {
      "url": "https://ai.gateway.services.apocrathia.com/mcp/",
      "headers": {
        "x-litellm-api-key": "Bearer <litellm-master-key>"
      }
    }
  }
}
```

### Direct Access

For direct access to the SearXNG MCP server:

- **Server URL**: `https://mcp.gateway.services.apocrathia.com/searxng`
- **Transport**: HTTP POST with JSON-RPC
- **Authentication**: None

### Testing the Connection

```bash
# List available tools
curl -X POST -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  https://mcp.gateway.services.apocrathia.com/searxng
```

## Available MCP Tools

The SearXNG MCP server provides these tools:

1. **searxng_web_search**

   - Execute web searches with pagination
   - **Input**: `{"query": "kubernetes best practices", "pageno": 1}`
   - **Optional**: `time_range` (day/month/year), `language`, `safesearch`

2. **web_url_read**
   - Read and convert URL content to markdown
   - **Input**: `{"url": "https://example.com/article"}`
   - **Optional**: `startChar`, `maxLength`, `section`, `paragraphRange`, `readHeadings`
