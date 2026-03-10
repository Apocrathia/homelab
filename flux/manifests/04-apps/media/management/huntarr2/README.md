# Huntarr2

Ground-up rewrite of huntarr that automates missing content and quality upgrade searches across Sonarr, Radarr, Lidarr, and Whisparr.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Huntarr2 scheduler for automated arr searches
- Go-based container with SQLite persistence
- Authentik SSO integration
- Longhorn persistent storage for database and encryption key

## Access

- **External URL**: `https://huntarr2.gateway.services.apocrathia.com`

## Configuration

All configuration is done through the web UI after deployment. Add arr instance URLs and API keys through the connections page, then adjust search schedules and batch sizes in settings.

See `helmrelease.yaml` for deployment configuration.

### Secrets

Create a 1Password item at `vaults/Secrets/items/huntarr2-secrets` with:

- **`encryption-key`**: 32-byte hex string used for AES encryption of arr API keys at rest. Generate with `openssl rand -hex 32`

## Authentication

Uses Authentik proxy provider for SSO. API endpoints (`/api/*`) are excluded from auth to avoid inflating login counts from frontend polling.

## Initial Setup

1. Access the web UI at the external URL
2. Add arr instances (URL + API key) on the connections page
3. Configure search schedules, batch sizes, and cooldowns in settings

## Troubleshooting

```bash
# Pod status
kubectl get pods -n huntarr2

# Application logs
kubectl logs deployment/huntarr2 -n huntarr2 -f

# Health check
kubectl exec deployment/huntarr2 -n huntarr2 -- wget -qO- http://localhost:9706/api/health

# Check config volume
kubectl exec deployment/huntarr2 -n huntarr2 -- ls -la /config
```

## References

- **[Huntarr2 GitHub](https://github.com/refringe/huntarr2)** - Source code and issues
- **[DeepWiki](https://deepwiki.com/refringe/huntarr2)** - Technical architecture documentation
- **[Huntarr.io Shenanigans](https://www.reddit.com/r/selfhosted/comments/1rckopd/huntarr_your_passwords_and_your_entire_arr_stacks/)** - Reddit post about Huntarr.io security issues
