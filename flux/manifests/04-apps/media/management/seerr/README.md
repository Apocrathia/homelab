# Seerr

Media request and discovery tool for Plex, Jellyfin, and Emby — the successor to Overseerr and Jellyseerr.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Request management for movies and TV shows with per-season granularity
- Integration with Sonarr and Radarr for automated media acquisition
- Plex/Jellyfin/Emby library scanning and user authentication
- Authentik SSO via proxy provider
- Longhorn persistent storage for configuration data

## Access

- **URL**: `https://seerr.gateway.services.apocrathia.com`

## Configuration

All configuration is done through the web UI after deployment. No secrets or environment variables are required for initial startup.

See `helmrelease.yaml` for complete deployment configuration.

## Authentication

Uses Authentik proxy provider for SSO. Internal authentication is handled by Plex/Jellyfin/Emby OAuth.

## Initial Setup

1. Access the web UI at the external URL
2. Sign in with Plex account (server admin)
3. Configure Plex server connection
4. Add Radarr/Sonarr server connections
5. Configure user permissions and request limits

## Migration from Overseerr

Seerr auto-migrates from Overseerr data on first startup. Point Seerr at the existing Overseerr config volume and it handles the rest. Back up the config volume before migrating.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n seerr

# Application logs
kubectl logs -n seerr deployment/seerr -f

# Check Authentik outpost
kubectl get pods -n authentik | grep seerr
```

## References

- **[Official Documentation](https://docs.seerr.dev/)** - Primary documentation source
- **[GitHub Repository](https://github.com/seerr-team/seerr)** - Source code and issues
- **[Migration Guide](https://docs.seerr.dev/migration-guide)** - Overseerr/Jellyseerr migration
