# Infrastructure Agent

> **Navigation**: [← Back to Agents README](../README.md)

## Overview

Infrastructure management agent for Proxmox, TrueNAS, and UniFi Network.

## Configuration

The behavior lives in the `AgentTemplate` CR (`agenttemplate.yaml`) in the
`kagent` namespace (the consolidated agent fleet); `agent.yaml` is a thin
`Agent` wrapper on the chart Harness. Model wiring in `modelconfig.yaml`; MCP
tools via `remotemcpserver.yaml` — all in `kagent`. homelab-agent binds this
agent as a same-namespace subAgent tool.

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
kubectl get agents infrastructure-agent --namespace kagent

# Controller logs (substrate agents run on the shared worker pool)
kubectl logs --namespace kagent deployment/kagent-controller -f
```

## References

- **[Proxmox MCP Server](../../mcp-servers/proxmox/README.md)** - Proxmox VE integration
- **[TrueNAS MCP Server](../../mcp-servers/truenas/README.md)** - TrueNAS integration
- **[UniFi MCP Server](../../mcp-servers/unifi/README.md)** - UniFi Network integration
