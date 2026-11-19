# Firecrawl MCP Server

Web scraping and content extraction via self-hosted Firecrawl backend.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Configuration

- **Backend**: Self-hosted Firecrawl at `http://firecrawl-api.firecrawl.svc.cluster.local:3002`
- **Access**: Internal only via LiteLLM proxy
- **Transport**: `transportType: stdio`, agentgateway exposes streamable HTTP on `/mcp` (port 8080)
- **Endpoint**: `http://firecrawl.mcp-firecrawl.svc.cluster.local:8080/mcp`

## Tools Available

- Web page scraping with JavaScript rendering
- Content extraction and markdown conversion
- Batch URL processing
- Site crawling

## Notes

Requires self-hosted Firecrawl deployment in `firecrawl` namespace.

## Troubleshooting

```bash
# MCPServer resource status
kubectl get mcpserver.kagent.dev firecrawl -n mcp-firecrawl

# Pod status
kubectl get pods -n mcp-firecrawl

# Server logs
kubectl logs -n mcp-firecrawl -l app.kubernetes.io/name=firecrawl --tail=50
```

## References

- **[Firecrawl Documentation](https://docs.firecrawl.dev/)** - Primary documentation source
- **[GitHub Repository](https://github.com/mendableai/firecrawl)** - Source code and issues
