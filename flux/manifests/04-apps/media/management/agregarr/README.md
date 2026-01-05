# Agregarr

Plex collection management tool that keeps Home and Recommended screens fresh with curated collections from Trakt, IMDb, TMDB, Letterboxd, MDBList, FlixPatrol, AniList, and MyAnimeList.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Agregarr Documentation](https://agregarr.org/docs)** - Official documentation
- **[Agregarr GitHub](https://github.com/agregarr/agregarr)** - Source code and issues

## Overview

This deployment includes:

- Agregarr collection manager with web UI configuration
- Authentik SSO integration
- Longhorn persistent storage for configuration and SQLite database

## Access

- **URL**: `https://agregarr.gateway.services.apocrathia.com`

## Configuration

All configuration is done through the web UI after deployment. No secrets or environment variables required for startup.

See `helmrelease.yaml` for deployment configuration.

## Authentication

Uses Authentik proxy provider for SSO. The generic-app chart handles blueprint and outpost creation automatically.

## Initial Setup

After deployment, access the web UI to configure:

1. Connect to Plex server
2. Add Radarr/Sonarr instances (optional)
3. Add Overseerr (optional)
4. Add Tautulli (optional)
5. Configure public lists from Trakt, IMDb, TMDB, etc.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n agregarr

# Application logs
kubectl logs -n agregarr deployment/agregarr -f

# Check Authentik outpost
kubectl get pods -n authentik | grep agregarr
```
