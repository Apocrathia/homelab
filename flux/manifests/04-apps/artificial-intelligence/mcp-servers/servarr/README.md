# Servarr MCP Server

The Servarr MCP server provides Sonarr and Radarr integration through the Model Context Protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

**Endpoint:** `http://servarr.mcp-servarr.svc.cluster.local:8080/mcp`

## Overview

This deployment includes:

- Servarr MCP server for Sonarr and Radarr operations
- kmcp MCPServer (`servarr`) with agentgateway HTTP adapter
- Internal access only via LiteLLM proxy
- Connection to internal Sonarr and Radarr instances

## Configuration

### Transport

`transportType: stdio` — agentgateway wraps the MCP process and exposes streamable HTTP on `/mcp` (port 8080).

### Environment Variables

| Variable          | Source | Description                                   |
| ----------------- | ------ | --------------------------------------------- |
| `SONARR_URL`      | Secret | Sonarr base URL                               |
| `SONARR_API_KEY`  | Secret | Sonarr API key                                |
| `RADARR_URL`      | Secret | Radarr base URL                               |
| `RADARR_API_KEY`  | Secret | Radarr API key                                |
| `REQUEST_TIMEOUT` | Config | HTTP request timeout in seconds (default: 30) |

### Secrets

Create a Kubernetes secret `servarr-mcp-secrets` in the `mcp-servarr` namespace with:

- `sonarr-url`: Sonarr base URL (e.g., `http://sonarr.media.svc.cluster.local:8989`)
- `sonarr-api-key`: Sonarr API key
- `radarr-url`: Radarr base URL (e.g., `http://radarr.media.svc.cluster.local:7878`)
- `radarr-api-key`: Radarr API key

**Note**: At least one service (Sonarr or Radarr) must be configured.

The hyphenated Secret keys are mounted read-only and exported as the four MCP environment variables by the startup command.

### Security

- **Permission Profile**: Network access for media management APIs
- **Authentication**: API keys via Kubernetes secrets

## Available MCP Tools

The Servarr MCP server provides tools for media management:

### Sonarr Tools

- Get recently added TV series
- View upcoming episode calendar
- Search series in library
- Check system status and disk space
- View download queue
- Refresh series metadata
- Trigger episode searches

### Radarr Tools

- Get recently added movies
- View upcoming movie releases
- Search movies in library
- Check system status and disk space
- View download queue
- Refresh movie metadata
- Trigger movie searches

## Troubleshooting

```bash
# Pod status
kubectl get pods -n mcp-servarr

# MCP server logs
kubectl logs -n mcp-servarr deployment/servarr -f

# Test Sonarr/Radarr connectivity
kubectl exec -n mcp-servarr deployment/servarr -- \
  curl -s -H "X-Api-Key: $SONARR_API_KEY" "$SONARR_URL/api/v3/system/status"
```

## References

- [mcp-servarr](https://github.com/bdfrost/mcp-servarr) - MCP server repository
- [Sonarr](https://sonarr.tv/) - TV series management
- [Radarr](https://radarr.video/) - Movie management
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation
