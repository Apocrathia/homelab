# OpenZIM MCP Server

The OpenZIM MCP server provides offline knowledge base querying through ZIM format archives.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Documentation

- [openzim-mcp](https://github.com/cameronrye/openzim-mcp) - MCP server repository
- [OpenZIM](https://wiki.openzim.org/) - ZIM file format documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation

## Overview

This deployment includes:

- OpenZIM MCP server for querying ZIM knowledge bases
- ToolHive proxy for secure communication
- Internal access only via LiteLLM proxy

## Configuration

### Transport

This server uses `transport: stdio` with `proxyMode: streamable-http`. The ToolHive proxy handles HTTP/session management while the MCP server runs in stdio mode.

### Environment Variables

| Variable                | Value    | Description                                 |
| ----------------------- | -------- | ------------------------------------------- |
| `OPENZIM_MCP_TOOL_MODE` | `simple` | Tool mode: `simple` (default) or `advanced` |

### Security

- **Permission Profile**: Network access
- **Authentication**: None required

## Available MCP Tools

The OpenZIM MCP server provides tools for querying ZIM knowledge bases:

1. **zim_query** (Simple Mode) - Natural language queries against ZIM files
2. **Advanced Mode Tools** - 15 specialized tools for granular ZIM operations when `OPENZIM_MCP_TOOL_MODE=advanced`
