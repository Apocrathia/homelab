# Plex MCP Server

The Plex MCP server provides Plex Media Server integration through the Model Context Protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Documentation

- [plex-mcp-server](https://github.com/vladimir-tutin/plex-mcp-server) - MCP server repository
- [Plex Media Server](https://www.plex.tv/) - Media server documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation

## Overview

This deployment includes:

- Plex MCP server for media library management
- ToolHive proxy for secure communication
- Internal access only via LiteLLM proxy
- Connection to internal Plex Media Server instance

## Configuration

### Transport

This server uses `transport: stdio` with `proxyMode: streamable-http`. The ToolHive proxy handles HTTP/session management while the MCP server runs in stdio mode.

### Environment Variables

| Variable        | Source | Description               |
| --------------- | ------ | ------------------------- |
| `PLEX_URL`      | Secret | Plex Media Server URL     |
| `PLEX_TOKEN`    | Secret | Plex authentication token |
| `PLEX_USERNAME` | Secret | Plex username (optional)  |

### Secrets

Create a Kubernetes secret `plex-mcp-secrets` in the `mcp-plex` namespace with:

- `plex-url`: Plex Media Server URL (e.g., `http://plex.media.svc.cluster.local:32400`)
- `plex-token`: Plex authentication token (Long-Lived Access Token)
- `plex-username`: Plex username (optional)

### Security

- **Permission Profile**: Network access for Plex API
- **Authentication**: Plex token via Kubernetes secrets

## Available MCP Tools

The Plex MCP server provides tools for media library management:

1. **Library Management** - List, refresh, scan libraries
2. **Media Operations** - Search, get details, edit metadata, delete media
3. **Playlist Management** - Create, edit, delete playlists
4. **Collection Management** - Manage media collections
5. **User Management** - Query user information and watch history
6. **Session Management** - View active sessions and playback history
7. **Server Operations** - Server logs, information, and statistics
8. **Client Control** - Control playback and client interfaces

## Troubleshooting

```bash
# Pod status
kubectl get pods -n mcp-plex

# MCP server logs
kubectl logs -n mcp-plex deployment/plex-mcp -c mcp -f

# Test Plex connectivity
kubectl exec -n mcp-plex deployment/plex-mcp -- \
  curl -s -H "X-Plex-Token: $PLEX_TOKEN" "$PLEX_URL/identity"
```
