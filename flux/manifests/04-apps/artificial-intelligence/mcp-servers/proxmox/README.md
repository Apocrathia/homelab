# Proxmox MCP Plus Server

The Proxmox MCP Plus server provides Proxmox virtualization management through the Model Context Protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Documentation

- [ProxmoxMCP-Plus](https://github.com/RekklesNA/ProxmoxMCP-Plus) - MCP server repository
- [Proxmox](https://www.proxmox.com/) - Proxmox VE documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation

## Overview

This deployment includes:

- Proxmox MCP Plus server for virtualization management
- ToolHive proxy for secure communication
- Internal access only via LiteLLM proxy
- Connection to Proxmox VE cluster

## Configuration

### Transport

This server uses `transport: stdio` with `proxyMode: streamable-http`. The ToolHive proxy handles HTTP/session management while the MCP server runs in stdio mode.

### Environment Variables

| Variable              | Source | Description                              |
| --------------------- | ------ | ---------------------------------------- |
| `PROXMOX_HOST`        | Secret | Proxmox server hostname or IP            |
| `PROXMOX_USER`        | Secret | Proxmox username (e.g., `user@pve`)      |
| `PROXMOX_TOKEN_NAME`  | Secret | Proxmox API token ID                     |
| `PROXMOX_TOKEN_VALUE` | Secret | Proxmox API token value                  |
| `PROXMOX_PORT`        | Config | Proxmox API port (default: 8006)         |
| `PROXMOX_VERIFY_SSL`  | Config | Verify SSL certificates (default: false) |

### Secrets

Create a Kubernetes secret `proxmox-mcp-secrets` in the `mcp-proxmox` namespace with:

- `proxmox-host`: Proxmox server hostname or IP
- `proxmox-user`: Proxmox username (e.g., `admin@pve`)
- `proxmox-token-name`: Proxmox API token ID
- `proxmox-token-value`: Proxmox API token value

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
