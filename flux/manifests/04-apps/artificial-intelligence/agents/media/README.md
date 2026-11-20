# Media Agent

> **Navigation**: [← Back to Agents README](../README.md)

## Overview

Media management agent for Servarr (Sonarr/Radarr) integration.

## Configuration

The behavior lives in the `AgentTemplate` CR (`agenttemplate.yaml`) in the
`kagent` namespace (the consolidated agent fleet); `agent.yaml` is a thin
`Agent` wrapper on the chart Harness. Model wiring in `modelconfig.yaml`; MCP
tools via `remotemcpserver.yaml` — all in `kagent`. homelab-agent binds this
agent as a same-namespace subAgent tool.

## Tools

- **servarr-mcp**: Sonarr and Radarr integration

## Capabilities

- Add TV shows and movies to monitoring
- Check download queue status
- Manage quality profiles
- Inspect upcoming release calendars

## Secrets

Requires 1Password item `media-agent-secrets` in Secrets vault with:

| Field             | Description     |
| ----------------- | --------------- |
| `litellm-api-key` | LiteLLM API key |

## Troubleshooting

```bash
# Check agent status
kubectl get agents media-agent --namespace kagent

# Controller logs (substrate agents run on the shared worker pool)
kubectl logs --namespace kagent deployment/kagent-controller -f
```

## References

- **[Servarr MCP Server](../../mcp-servers/servarr/README.md)** - Sonarr/Radarr integration
