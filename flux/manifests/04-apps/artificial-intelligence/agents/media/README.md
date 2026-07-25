# Media Agent

Media management agent for Servarr (Sonarr/Radarr) integration.

> **Navigation**: [← Back to Agents README](../README.md)

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
kubectl get agents media-agent --namespace agent-media

# View agent logs
kubectl logs --namespace agent-media -l app.kubernetes.io/name=media-agent -f
```

## References

- **[Servarr MCP Server](../../../mcp-servers/servarr/README.md)** - Sonarr/Radarr integration
