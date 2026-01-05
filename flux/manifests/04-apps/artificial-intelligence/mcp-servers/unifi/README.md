# UniFi Network MCP Server

The UniFi Network MCP server provides network management capabilities through the Model Context Protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Documentation

- [unifi-network-mcp](https://github.com/sirkirby/unifi-network-mcp) - MCP server repository
- [UniFi Network](https://www.ui.com/software/) - UniFi Network Controller documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation

## Overview

This deployment includes:

- UniFi Network MCP server for network management operations
- ToolHive proxy for secure communication
- Internal access only via LiteLLM proxy
- Connection to internal UniFi Controller instance

## Configuration

### Transport

This server uses `transport: stdio` with `proxyMode: streamable-http`. The ToolHive proxy handles HTTP/session management while the MCP server runs in stdio mode.

### Environment Variables

| Variable           | Source                    | Description                     |
| ------------------ | ------------------------- | ------------------------------- |
| `UNIFI_HOST`       | Config                    | UniFi Controller hostname or IP |
| `UNIFI_USERNAME`   | Secret                    | UniFi administrator username    |
| `UNIFI_PASSWORD`   | Secret                    | UniFi administrator password    |
| `UNIFI_PORT`       | Config (default: 443)     | HTTPS port of UniFi Controller  |
| `UNIFI_SITE`       | Config (default: default) | Site name to manage             |
| `UNIFI_VERIFY_SSL` | Config (default: false)   | Verify SSL certificates         |

### Secrets

Create a Kubernetes secret `unifi-mcp-secrets` in the `mcp-unifi` namespace with:

- `username`: UniFi administrator username
- `password`: UniFi administrator password

### Security

- **Permission Profile**: Network access for UniFi API
- **Authentication**: UniFi credentials via Kubernetes secrets

## Available MCP Tools

The UniFi Network MCP server provides tools for managing network resources:

1. **Client Management** - Query and manage UniFi clients
2. **Device Management** - Monitor and configure network devices
3. **Network Configuration** - Manage networks and WLANs
4. **Firewall & Security** - Configure firewall rules and security policies
5. **VPN Management** - Configure VPN connections
6. **QoS Configuration** - Manage Quality of Service settings
7. **Statistics** - Query network statistics and metrics
8. **System Operations** - System-level operations and monitoring
