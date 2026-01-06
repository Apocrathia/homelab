# Recommendarr

[← Media Management](../README.md)

AI-powered TV show and movie recommendation engine that integrates with existing media libraries.

## Links

- [GitHub Repository](https://github.com/fingerthief/recommendarr)
- [Docker Hub](https://hub.docker.com/r/tannermiddleton/recommendarr)

## Access

- **URL**: <https://recommendarr.gateway.services.apocrathia.com>
- **Authentication**: Authentik OIDC (Custom OAuth)

## Configuration

Uses Authentik OIDC mode for single sign-on. After Authentik creates the OAuth provider:

1. Get client credentials from Authentik admin UI (Applications → Providers → recommendarr-oidc-provider)
2. Create 1Password item `recommendarr` with fields:
   - `oauth-client-id`: Client ID from Authentik
   - `oauth-client-secret`: Client Secret from Authentik

Configure integrations through the web UI:

- **AI Provider**: Add OpenAI API key or configure compatible LLM endpoint
- **Sonarr/Radarr**: Connect to media management services for library data
- **Watch History**: Optionally connect Plex, Jellyfin, Tautulli, or Trakt

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n recommendarr

# View application logs
kubectl logs -n recommendarr -l app=recommendarr -f

# Verify service connectivity
kubectl get svc -n recommendarr
```
