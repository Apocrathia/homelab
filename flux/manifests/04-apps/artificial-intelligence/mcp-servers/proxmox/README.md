# Proxmox MCP Plus Server

The Proxmox MCP Plus server provides Proxmox virtualization management through the Model Context Protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Overview

This deployment includes:

- Proxmox MCP Plus server for virtualization management
- ToolHive proxy for secure communication
- Internal access only via LiteLLM proxy
- Connection to Proxmox VE cluster

During the kmcp migration, this namespace runs ToolHive `proxmox-mcp-plus`
and kmcp `proxmox-kmcp` side by side. Clients remain on the ToolHive endpoint
until cutover; the kmcp endpoint is
`http://proxmox-kmcp.mcp-proxmox.svc.cluster.local:8080/mcp`.

## Configuration

### Transport

This server uses `transport: stdio` with `proxyMode: streamable-http`. The ToolHive proxy handles HTTP/session management while the MCP server runs in stdio mode.

### Environment Variables

| Variable              | Source | Description                                                                |
| --------------------- | ------ | -------------------------------------------------------------------------- |
| `PROXMOX_HOST`        | Secret | Proxmox server hostname or IP                                              |
| `PROXMOX_USER`        | Secret | Proxmox username (e.g., `user@pve`)                                        |
| `PROXMOX_TOKEN_NAME`  | Secret | Proxmox API token ID                                                       |
| `PROXMOX_TOKEN_VALUE` | Secret | Proxmox API token value                                                    |
| `PROXMOX_PORT`        | Config | Proxmox API port (default: 8006)                                           |
| `PROXMOX_VERIFY_SSL`  | Config | Verify SSL certificates (default: false)                                   |
| `PROXMOX_DEV_MODE`    | Config | Enable dev mode (required when `PROXMOX_VERIFY_SSL=false`; default: false) |

### Secrets

Create a Kubernetes secret `proxmox-mcp-secrets` in the `mcp-proxmox` namespace with:

- `proxmox-host`: Proxmox server hostname or IP
- `proxmox-user`: Proxmox username (e.g., `admin@pve`)
- `proxmox-token-name`: Proxmox API token ID
- `proxmox-token-value`: Proxmox API token value

kmcp `secretRefs` exposes every Secret key through `envFrom`, without
per-key environment-variable renaming. The kmcp draft instead mounts the same
generated Secret at `/var/run/secrets/mcp` and maps the four `proxmox-*` keys
to the required `PROXMOX_*` variables before the MCP process starts.

### Security

- **Permission Profile**: Network access for Proxmox API
- **Authentication**: API token via Kubernetes secrets

## Available MCP Tools

The Proxmox MCP Plus server provides tools for virtualization management:

1. **VM Lifecycle Management** - Create, start, stop, reset, shutdown, delete VMs
2. **Power Management** - Enhanced control over VM power states
3. **Container Support** - Manage LXC containers (list, start, stop, restart, update)
4. **Storage Management** - Monitor storage pools and volumes
5. **Cluster Health** - Check cluster status and health
6. **VM Console** - Execute commands in VM consoles
7. **Resource Management** - Update container CPU, memory, swap, and disk resources

## Troubleshooting

```bash
# Pod status
kubectl get pods -n mcp-proxmox

# MCP server logs (the underlying StatefulSet pod runs the actual server)
kubectl logs proxmox-mcp-plus-0 -n mcp-proxmox -f

# Test Proxmox connectivity
kubectl exec proxmox-mcp-plus-0 -n mcp-proxmox -- \
  curl -s -k "https://$PROXMOX_HOST:8006/api2/json/version"
```

## References

- [ProxmoxMCP-Plus](https://github.com/RekklesNA/ProxmoxMCP-Plus) - MCP server repository
- [Proxmox](https://www.proxmox.com/) - Proxmox VE documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation
