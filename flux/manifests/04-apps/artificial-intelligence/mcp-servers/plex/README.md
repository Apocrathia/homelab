# Plex MCP Server

The Plex MCP server provides Plex Media Server integration through the Model Context Protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Overview

This deployment includes:

- Plex MCP server for media library management
- ToolHive proxy for secure communication
- Internal access only via LiteLLM proxy
- Connection to internal Plex Media Server instance

During the kmcp migration, this namespace runs ToolHive `plex-mcp-server` and
kmcp `plex-kmcp` side by side. Clients remain on the ToolHive endpoint until
cutover; the kmcp endpoint is
`http://plex-kmcp.mcp-plex.svc.cluster.local:8080/mcp`.

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

kmcp `secretRefs` exposes every Secret key through `envFrom`, without
per-key environment-variable renaming. The kmcp draft instead mounts the same
generated Secret at `/var/run/secrets/mcp` and maps `plex-url`, `plex-token`,
and optional `plex-username` to the required `PLEX_*` variables before the MCP
process starts.

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

## References

- [plex-mcp-server](https://github.com/vladimir-tutin/plex-mcp-server) - MCP server repository
- [Plex Media Server](https://www.plex.tv/) - Media server documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation
