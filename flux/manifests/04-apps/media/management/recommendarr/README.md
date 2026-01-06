# Recommendarr

[← Media Management](../README.md)

AI-powered TV show and movie recommendation engine that integrates with existing media libraries.

## Links

- [GitHub Repository](https://github.com/fingerthief/recommendarr)
- [Docker Hub](https://hub.docker.com/r/tannermiddleton/recommendarr)

## Access

- **URL**: <https://recommendarr.gateway.services.apocrathia.com>
- **Authentication**: Authentik proxy

## Initial Setup

After deployment, access the web UI and log in with default credentials:

- Username: `admin`
- Password: `1234` (change immediately)

Configure integrations through the web UI:

1. **AI Provider**: Add OpenAI API key or configure compatible LLM endpoint
2. **Sonarr/Radarr**: Connect to media management services for library data
3. **Watch History**: Optionally connect Plex, Jellyfin, Tautulli, or Trakt

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n recommendarr

# View application logs
kubectl logs -n recommendarr -l app=recommendarr -f

# Verify service connectivity
kubectl get svc -n recommendarr
```
