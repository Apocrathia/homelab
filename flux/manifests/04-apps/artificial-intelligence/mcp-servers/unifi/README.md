# UniFi Network MCP Server

The UniFi Network MCP server provides network management capabilities through the Model Context Protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Overview

This deployment includes:

- UniFi Network MCP server for network management operations
- ToolHive proxy for secure communication
- Internal access only via LiteLLM proxy
- Connection to internal UniFi Controller instance

## Configuration

### Transport

This server uses `transport: streamable-http` on the MCPServer (same pattern as Grafana/Discord). The UniFi image listens for MCP over HTTP; `UNIFI_MCP_PORT` matches `targetPort` (8080). ToolHive still exposes the usual in-cluster proxy service URL for LiteLLM and agents.

### Environment Variables

| Variable                       | Source                    | Description                                                                                     |
| ------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------- |
| `UNIFI_HOST`                   | Secret (`host` key)       | Hostname or IP only (no `https://`)                                                             |
| `UNIFI_TOOL_REGISTRATION_MODE` | Optional (default `lazy`) | `lazy` (meta-tools only at list time), `eager` (register many tools at startup), or `meta_only` |
| `UNIFI_USERNAME`               | Secret                    | UniFi administrator username                                                                    |
| `UNIFI_PASSWORD`               | Secret                    | UniFi administrator password                                                                    |
| `UNIFI_PORT`                   | Config (default: 443)     | HTTPS port of UniFi Controller                                                                  |
| `UNIFI_SITE`                   | Config (default: default) | Site name to manage                                                                             |
| `UNIFI_VERIFY_SSL`             | Config (default: false)   | Verify SSL certificates                                                                         |

### Secrets

The `OnePasswordItem` `unifi-mcp-secrets` supplies:

- `host`: Controller hostname (not a full URL)
- `username`: UniFi administrator username
- `password`: UniFi administrator password

### Tool lists (lazy vs eager)

Upstream defaults to **`lazy`**: `tools/list` exposes only the **meta-tools** (`unifi_tool_index`, `unifi_execute`, `unifi_batch`, `unifi_batch_status`, `unifi_load_tools`). The remaining tools exist but are loaded when used. Gateways that expect dozens of named tools at once can look “empty” compared to other MCPs.

- **Leave lazy** if clients support `unifi_execute` / `unifi_load_tools` (recommended for context size).
- **Use eager** to populate `tools/list` broadly: set `UNIFI_TOOL_REGISTRATION_MODE=eager` and usually `UNIFI_ENABLED_CATEGORIES` (comma-separated) so you do not register all ~166 tools. See [upstream configuration](https://github.com/sirkirby/unifi-network-mcp/blob/main/apps/network/docs/configuration.md).

**LiteLLM** may prefix tool names with the server key (for example `unifi_…`). **kagent** `infrastructure-agent` whitelists four UniFi tool names; that is intentional for lazy mode.

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

## Troubleshooting

If logs show `https://https://…`, `UNIFI_HOST` incorrectly includes a scheme; use the bare hostname only.

```bash
# Pod status
kubectl get pods -n mcp-unifi

# MCP server logs
kubectl logs -n mcp-unifi deployment/unifi-mcp -c mcp -f

# Test UniFi connectivity
kubectl exec -n mcp-unifi deployment/unifi-mcp -- \
  curl -s -k "https://$UNIFI_HOST:$UNIFI_PORT"
```

## References

- [unifi-network-mcp](https://github.com/sirkirby/unifi-network-mcp) - MCP server repository
- [UniFi Network](https://www.ui.com/software/) - UniFi Network Controller documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation
