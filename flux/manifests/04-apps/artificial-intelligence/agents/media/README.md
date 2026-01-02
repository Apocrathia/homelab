# Media Agent

Media management agent for Plex and Servarr (Sonarr/Radarr) integration.

## Tools

- **plex-mcp**: Plex Media Server integration
- **servarr-mcp**: Sonarr and Radarr integration

## Capabilities

- Browse and search media libraries
- Check playback status and user sessions
- Add TV shows and movies to monitoring
- Check download queue status
- Manage quality profiles

## Secrets

Requires 1Password item `media-agent-secrets` in Secrets vault with:

| Field             | Description     |
| ----------------- | --------------- |
| `litellm-api-key` | LiteLLM API key |
