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
- Internal access only via LiteLLM proxy
- Connection to internal SearXNG instance

## Configuration

### Transport

This server uses `transport: stdio` with `proxyMode: streamable-http`. The ToolHive proxy handles HTTP/session management while the MCP server runs in stdio mode. This avoids HTTP 400 errors from strict MCP session handling that can break LiteLLM's MCP client.

### Environment Variables

| Variable      | Value                                           | Description               |
| ------------- | ----------------------------------------------- | ------------------------- |
| `SEARXNG_URL` | `http://searxng.searxng.svc.cluster.local:8080` | Internal SearXNG instance |

### Security

- **Permission Profile**: Network access for search queries
- **Authentication**: None required

## Access

This server is accessible only through the LiteLLM proxy. See the [main README](../README.md) for details.

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

## Troubleshooting

```bash
# Pod status
kubectl get pods -n mcp-searxng

# MCP server logs
kubectl logs -n mcp-searxng deployment/searxng-mcp -c mcp -f

# Test SearXNG connectivity
kubectl exec -n mcp-searxng deployment/searxng-mcp -- \
  curl -s http://searxng.searxng.svc.cluster.local:8080/healthz
```
