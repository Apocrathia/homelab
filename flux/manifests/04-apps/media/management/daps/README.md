# DAPS

DAPS (Drazzilb's Arr PMM Scripts) is a collection of useful scripts for media management and automation, including poster management, ARR automation, and asset processing.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- DAPS web UI for media management automation
- Authentik SSO integration
- Longhorn persistent storage for configuration and poster assets

## Access

- **URL**: `https://daps.gateway.services.apocrathia.com`

## Configuration

All configuration is done through the web UI after deployment. No secrets or environment variables required for startup.

See `helmrelease.yaml` for deployment configuration.

## Authentication

Uses Authentik proxy provider for SSO. The generic-app chart handles blueprint and outpost creation automatically.

## Initial Setup

After deployment, access the web UI to configure:

1. Connect to Plex server (optional)
2. Add Radarr/Sonarr instances (optional)
3. Configure poster management settings
4. Set up automation scripts

## Troubleshooting

```bash
# Pod status
kubectl get pods -n daps

# Application logs
kubectl logs -n daps deployment/daps -f

# Check Authentik outpost
kubectl get pods -n authentik | grep daps
```

## References

- **[DAPS GitHub](https://github.com/Drazzilb08/daps)** - Source code and documentation
- **[DAPS Deepwiki](https://deepwiki.com/Drazzilb08/DAPS)** - Technical architecture details
