# Infrastructure Agent

Infrastructure management agent for Proxmox, TrueNAS, and UniFi Network.

> **Navigation**: [← Back to Agents README](../README.md)

## Documentation

- **[Proxmox MCP Server](../../../mcp-servers/proxmox/README.md)** - Proxmox VE integration
- **[TrueNAS MCP Server](../../../mcp-servers/truenas/README.md)** - TrueNAS integration
- **[UniFi MCP Server](../../../mcp-servers/unifi/README.md)** - UniFi Network integration

## Tools

- **proxmox-mcp**: Proxmox VE virtualization management
- **truenas-mcp**: TrueNAS storage management
- **unifi-mcp**: UniFi network management

## Capabilities

- VM and container lifecycle management
- Storage pool and dataset monitoring
- Network device and client status
- Cross-platform infrastructure health checks

## Secrets

Requires 1Password item `infrastructure-agent-secrets` in Secrets vault with:

| Field             | Description     |
| ----------------- | --------------- |
| `litellm-api-key` | LiteLLM API key |

## Troubleshooting

```bash
# Check agent status
kubectl get agents -n kagent infrastructure-agent

# View agent logs
kubectl logs -n kagent -l app.kubernetes.io/name=infrastructure-agent -f
```
