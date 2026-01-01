# A2A MCP Server

Bridge between Model Context Protocol (MCP) and Agent-to-Agent (A2A) protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Documentation

- [A2A-MCP-Server](https://github.com/GongRzhe/A2A-MCP-Server) - MCP server repository
- [A2A Protocol](https://a2a-protocol.org) - Agent-to-Agent protocol documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation

## Overview

This deployment includes:

- A2A MCP server for bridging MCP and A2A protocols
- ToolHive proxy for secure communication
- Internal access only via LiteLLM proxy
- Dynamic agent registration and communication

## Configuration

### Transport

This server uses `transport: stdio` with `proxyMode: streamable-http`. The ToolHive proxy handles HTTP/session management while the MCP server runs in stdio mode.

### Environment Variables

| Variable           | Value             | Description                                |
| ------------------ | ----------------- | ------------------------------------------ |
| `MCP_TRANSPORT`    | `streamable-http` | Transport type (handled by ToolHive proxy) |
| `MCP_HOST`         | `0.0.0.0`         | Host address                               |
| `MCP_PORT`         | `8080`            | Port for HTTP transport                    |
| `MCP_PATH`         | `/mcp`            | Endpoint path                              |
| `A2A_MCP_DATA_DIR` | `/tmp/a2a-data`   | Data directory (ephemeral)                 |

### Resources

- **CPU**: 100m requests, 500m limits
- **Memory**: 256Mi requests, 512Mi limits
- **Network Access**: Required for A2A agent communication

### Security

- **Permission Profile**: Network access for A2A agent endpoints
- **Authentication**: None required (agents manage their own auth)

## Available Agents

The following agents are available for registration via A2A MCP tools. **All agent communication goes through LiteLLM's A2A gateway** for unified access:

### Via LiteLLM A2A Gateway (Recommended)

- **homelab-agent**: `http://litellm.litellm.svc.cluster.local:4000/a2a/homelab-agent`
- **search-agent**: `http://litellm.litellm.svc.cluster.local:4000/a2a/search-agent`

These agents are registered in LiteLLM's `agent_list` and should be registered with the a2a-mcp-server using these LiteLLM gateway URLs to ensure all communication routes through the LiteLLM proxy.

## Access

This server is accessible only through the LiteLLM proxy. See the [main README](../README.md) for details.

## Usage

### Registering Agents

Use the MCP tools to register A2A agents dynamically. **Always use LiteLLM A2A gateway URLs** to route through the LiteLLM proxy:

1. **homelab-agent** (via LiteLLM):

   ```
   http://litellm.litellm.svc.cluster.local:4000/a2a/homelab-agent
   ```

2. **search-agent** (via LiteLLM):
   ```
   http://litellm.litellm.svc.cluster.local:4000/a2a/search-agent
   ```

**Important**: All agent communication should go through LiteLLM's A2A gateway for unified access, authentication, and monitoring. Direct kagent controller URLs should not be used.

### Available MCP Tools

The A2A MCP server provides these tools:

1. **Agent Registration** - Register A2A agents with their endpoint URLs
2. **Agent Discovery** - List all registered agents
3. **Message Sending** - Send messages to registered agents and receive responses
4. **Task Management** - Track tasks, retrieve results, cancel running tasks
5. **Agent Unregistration** - Remove agents from the registry

## Integration

Enables MCP clients (Cursor, Open WebUI, Claude Desktop) to communicate with kagent agents and other A2A-compatible agents via the A2A protocol. Agents are registered dynamically through MCP tools, providing flexibility to add or remove agents without restarting the server.
