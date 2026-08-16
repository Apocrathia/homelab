# A2A MCP Server

Bridge between Model Context Protocol (MCP) and Agent-to-Agent (A2A) protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Overview

This deployment includes:

- A2A MCP server for bridging MCP and A2A protocols
- kmcp MCPServer (`a2a`) with agentgateway HTTP adapter
- Internal access only via LiteLLM proxy
- Dynamic agent registration and communication

**Endpoint:** `http://a2a.mcp-a2a.svc.cluster.local:8080/mcp`

## Configuration

### Transport

`transportType: stdio` — agentgateway wraps the MCP process and exposes streamable HTTP on `/mcp` (port 8080).

### Environment Variables

| Variable           | Value             | Description                       |
| ------------------ | ----------------- | --------------------------------- |
| `MCP_TRANSPORT`    | `streamable-http` | Transport type (via agentgateway) |
| `MCP_HOST`         | `0.0.0.0`         | Host address                      |
| `MCP_PORT`         | `8080`            | Port for HTTP transport           |
| `MCP_PATH`         | `/mcp`            | Endpoint path                     |
| `A2A_MCP_DATA_DIR` | `/tmp/a2a-data`   | Data directory (ephemeral)        |

The agent registry is ephemeral under `/tmp/a2a-data` (pod restart clears registrations).

### Security

- **Permission Profile**: Network access for A2A agent endpoints
- **Authentication**: None required (agents manage their own auth)

## Available Agents

Register agents with the **kagent controller base A2A URL** only:

```
http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/<namespace>/<name>
```

Do **not** append `/.well-known/agent-card.json` (or `agent.json`). The
server tool `register_agent` (LiteLLM: `a2a-register_agent`) stores the
registration URL and `send_message` (LiteLLM: `a2a-send_message`) POSTs to
it; the card path is for discovery only (fetched automatically).

User agents live in `agent-*` namespaces (not `kagent`). System agents (and `homelab-agent`) live in `kagent`.

### User agents (`agent-*`)

| Agent                | Registration URL                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| git-agent            | `http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/agent-git/git-agent`                       |
| home-agent           | `http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/agent-home/home-agent`                     |
| infrastructure-agent | `http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/agent-infrastructure/infrastructure-agent` |
| media-agent          | `http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/agent-media/media-agent`                   |
| search-agent         | `http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/agent-search/search-agent`                 |
| knowledge-agent      | `http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/agent-knowledge/knowledge-agent`           |

### Agents in `kagent`

| Agent         | Registration URL                                                                      |
| ------------- | ------------------------------------------------------------------------------------- |
| homelab-agent | `http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/kagent/homelab-agent` |

Other Ready agents in the `kagent` namespace use the same `/api/a2a/kagent/<name>` shape.

## Access

This server is accessible only through the LiteLLM proxy. See the [main README](../README.md) for details.

## Usage

### Registering Agents

Via LiteLLM, call `a2a-register_agent` with a base URL from the tables above
(server-native name: `register_agent`). Example URL:

```
http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/agent-search/search-agent
```

### Available MCP Tools

Server-native names (unprefixed). Through LiteLLM the same tools appear as
`a2a-<name>` (hyphen after `a2a`, underscore in the rest):

| Native           | LiteLLM              | Role                                     |
| ---------------- | -------------------- | ---------------------------------------- |
| `register_agent` | `a2a-register_agent` | Register A2A agents by base endpoint URL |
| `list_agents`    | `a2a-list_agents`    | List registered agents                   |
| `send_message`   | `a2a-send_message`   | Send a message to a registered agent     |

Other native tools cover task management and unregistration; LiteLLM prefixes
them the same way (`a2a-…`).

## Integration

Enables MCP clients (Cursor, Open WebUI, Claude Desktop) to communicate with kagent agents and other A2A-compatible agents via the A2A protocol. Agents are registered dynamically through MCP tools, providing flexibility to add or remove agents without restarting the server.

## References

- [A2A-MCP-Server](https://github.com/GongRzhe/A2A-MCP-Server) - MCP server repository
- [A2A Protocol](https://a2a-protocol.org) - Agent-to-Agent protocol documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation
