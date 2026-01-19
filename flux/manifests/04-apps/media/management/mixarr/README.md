# Mixarr

Music discovery companion for Lidarr and Plex that integrates with multiple music services to discover new artists and releases using AI-powered recommendations.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Mixarr Documentation](https://aquantumofdonuts.github.io/mixarr/)** - Primary documentation source
- **[Mixarr GitHub](https://github.com/aquantumofdonuts/mixarr)** - Source code and issues

## Overview

This deployment includes:

- Music discovery from multiple services (Spotify, TIDAL, Deezer, Last.fm, MusicBrainz, Plex/Tautulli, Jellyfin)
- AI-powered recommendations using OpenAI, Anthropic, or Ollama
- Automated artist discovery and review queue
- Integration with Lidarr for automatic artist additions
- Authentik SSO integration for secure access
- Longhorn persistent storage for application data

## Access

- **URL**: `https://mixarr.gateway.services.apocrathia.com`

## Configuration

Configuration is done through the web UI after first deployment. The application requires environment variables for session management and base URLs, which are configured in `helmrelease.yaml`.

See `helmrelease.yaml` for complete deployment configuration.

### Secrets

Create a 1Password item at `vaults/Secrets/items/mixarr-secrets` with the following field:

- `session-secret`: Secure random string for session encryption (generate with `openssl rand -hex 32`)

## Authentication

Uses Authentik proxy provider for SSO. Authentication is handled at the network layer before requests reach the application.

## Initial Setup

1. Access the web UI at the configured URL
2. Create an admin account on first launch
3. Configure base URL in **Settings** → **Global Settings** (should match `FRONTEND_URL` in manifest)
4. Connect Lidarr: **Connections** → **Add Lidarr** → Enter URL and API key
5. Add music services (optional): Last.fm, Spotify, TIDAL, Deezer, etc.
6. Configure AI recommendations (optional): Add OpenAI/Anthropic API key or Ollama URL

## Troubleshooting

```bash
# Pod status
kubectl get pods -n mixarr

# Application logs
kubectl logs -n mixarr deployment/mixarr -f

# Check Authentik outpost
kubectl get pods -n authentik | grep mixarr

# Verify health endpoint
kubectl -n mixarr exec -it deployment/mixarr -- curl http://localhost:3010/api/health
```
