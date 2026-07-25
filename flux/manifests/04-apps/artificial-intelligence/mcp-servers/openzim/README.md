# OpenZIM MCP Server

The OpenZIM MCP server provides offline knowledge base querying through ZIM format archives.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Overview

This deployment includes:

- OpenZIM MCP server for querying ZIM knowledge bases
- kmcp MCPServer (`openzim`) with agentgateway HTTP adapter
- Internal access only via LiteLLM proxy

**Endpoint:** `http://openzim.mcp-openzim.svc.cluster.local:8080/mcp`

## Configuration

### Transport

`transportType: stdio` — agentgateway wraps the MCP process and exposes streamable HTTP on `/mcp` (port 8080).

### Storage

The OpenZIM process reads ZIM archives from `/data`. The `openzim-zim` PVC
mounts the read-only SMB-backed storage defined in `storage.yaml`; the
OnePasswordItem there supplies SMB credentials to the CSI driver.

### Environment Variables

| Variable                | Value      | Description                                 |
| ----------------------- | ---------- | ------------------------------------------- |
| `OPENZIM_MCP_TOOL_MODE` | `advanced` | Tool mode: `simple` (default) or `advanced` |

### Security

- **Permission Profile**: Network access
- **Authentication**: None required

## Available MCP Tools

The OpenZIM MCP server runs in advanced mode, providing specialized tools for ZIM operations:

- **list_zim_files** - List available ZIM files with names and paths
- **search_zim_file** - Search content within a ZIM file
- **get_zim_entry** - Retrieve full article content by path
- **get_search_suggestions** - Get autocomplete suggestions for partial queries

Additional advanced tools are available but not exposed to agents (server diagnostics, namespace browsing, etc.).

## References

- [openzim-mcp](https://github.com/cameronrye/openzim-mcp) - MCP server repository
- [OpenZIM](https://wiki.openzim.org/) - ZIM file format documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation
