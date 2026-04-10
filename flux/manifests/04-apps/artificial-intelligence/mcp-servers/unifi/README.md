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

The MCPServer uses **`transport: stdio`** with **`proxyMode: streamable-http`**. The ToolHive proxy terminates HTTP (port 8080 on the proxy `Service`) and speaks MCP to the UniFi container over stdio, so the container must have **`stdin: true`**.

The UniFi image can start an in-container HTTP listener by default in some environments. This deployment sets **`UNIFI_MCP_HTTP_ENABLED=false`** so the process stays on stdio and matches ToolHive’s expectations. Clients (LiteLLM, kagent `RemoteMCPServer`, etc.) still use the proxy URL, for example `http://mcp-unifi-network-mcp-proxy.mcp-unifi.svc.cluster.local:8080/mcp`.

### Environment Variables

| Variable                       | Source                    | Description                                                                                     |
| ------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------- |
| `UNIFI_HOST`                   | Secret (`host` key)       | Hostname or IP only (no `https://`)                                                             |
| `UNIFI_USERNAME`               | Secret                    | UniFi administrator username                                                                    |
| `UNIFI_PASSWORD`               | Secret                    | UniFi administrator password                                                                    |
| `UNIFI_PORT`                   | Config (default: 443)     | HTTPS port of UniFi Controller                                                                  |
| `UNIFI_SITE`                   | Config (default: default) | Site name to manage                                                                             |
| `UNIFI_VERIFY_SSL`             | Config (default: false)   | Verify SSL certificates                                                                         |
| `UNIFI_MCP_HTTP_ENABLED`       | Config (`false` here)     | Disables in-container HTTP so MCP runs over stdio with ToolHive                                 |
| `UNIFI_TOOL_REGISTRATION_MODE` | Optional (default `lazy`) | `lazy` (meta-tools only at list time), `eager` (register many tools at startup), or `meta_only` |

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
# Pod status (ToolHive runs a proxy Deployment and a StatefulSet for the MCP workload)
kubectl get pods --namespace=mcp-unifi

# MCP process logs (stdio container on the StatefulSet)
kubectl logs statefulset/unifi-network-mcp --namespace=mcp-unifi -f

# ToolHive proxy logs
kubectl logs deployment/unifi-network-mcp --namespace=mcp-unifi -f
```

## References

- [unifi-network-mcp](https://github.com/sirkirby/unifi-network-mcp) - MCP server repository
- [UniFi Network](https://www.ui.com/software/) - UniFi Network Controller documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation
