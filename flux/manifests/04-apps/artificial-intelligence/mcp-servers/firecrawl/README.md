# Firecrawl MCP Server

Web scraping and content extraction via self-hosted Firecrawl backend.

> **Navigation**: [← Back to MCP Servers README](../README.md)

During the kmcp migration this namespace runs two MCPServer CRs side by side:
the ToolHive CR `firecrawl-mcp` (`mcpserver.yaml`) and the kmcp CR `firecrawl`
(`mcpserver-kmcp.yaml`, `kagent.dev/v1alpha1`). The kmcp CR is served at
`http://firecrawl.mcp-firecrawl.svc.cluster.local:8080/mcp`. Clients cut over
to kmcp during soak; the ToolHive CR remains temporarily as rollback.

## Configuration

- **Backend**: Self-hosted Firecrawl at `http://firecrawl-api.firecrawl.svc.cluster.local:3002`
- **Access**: Internal only via LiteLLM proxy
- **Transport**: Streamable HTTP on port 8080

## Tools Available

- Web page scraping with JavaScript rendering
- Content extraction and markdown conversion
- Batch URL processing
- Site crawling

## Notes

Requires self-hosted Firecrawl deployment in `firecrawl` namespace.

## References

- **[Firecrawl Documentation](https://docs.firecrawl.dev/)** - Primary documentation source
- **[GitHub Repository](https://github.com/mendableai/firecrawl)** - Source code and issues
