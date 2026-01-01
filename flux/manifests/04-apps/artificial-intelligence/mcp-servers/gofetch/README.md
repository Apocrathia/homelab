# GoFetch MCP Server

The GoFetch MCP server provides web content retrieval capabilities through the Model Context Protocol. This is the Go implementation of the Fetch server, which retrieves and processes content from web pages.

> **Navigation**: [← Back to MCP Servers README](../README.md)

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
- Internal access only via LiteLLM proxy
- Network permission profile for web access

## Configuration

## Access

This server is accessible only through the LiteLLM proxy. See the [main README](../README.md) for details.

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
