# Firecrawl MCP Server

Web scraping and content extraction via self-hosted Firecrawl backend.

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
