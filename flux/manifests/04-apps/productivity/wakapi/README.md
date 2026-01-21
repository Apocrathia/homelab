# Wakapi

Self-hosted WakaTime-compatible backend for tracking coding statistics across editors and projects.

> **Navigation**: [← Back to Productivity README](../README.md)

## Overview

This deployment includes:

- Coding statistics tracking (projects, languages, editors, hosts)
- PostgreSQL database via CloudNativePG
- Authentik SSO via proxy provider with trusted header authentication
- REST API compatible with WakaTime client plugins

## Access

- **URL**: `https://wakapi.gateway.services.apocrathia.com`
- **API**: `https://wakapi.gateway.services.apocrathia.com/api`

## Configuration

Configuration via environment variables in helmrelease. See `helmrelease.yaml` for complete deployment configuration.

### Secrets

Create a 1Password item at `vaults/Secrets/items/wakapi-secrets` with:

| Field           | Description                                    |
| --------------- | ---------------------------------------------- |
| `username`      | PostgreSQL database username (e.g., `wakapi`)  |
| `password`      | PostgreSQL database password                   |
| `password-salt` | Random string for password hashing (32+ chars) |

## Authentication

Uses Authentik proxy provider with trusted header authentication. Wakapi reads the `X-authentik-username` header to identify users. New users are automatically created on first login.

## Client Setup

After deployment, configure WakaTime client plugins:

1. Install the WakaTime plugin for your editor
2. Edit `~/.wakatime.cfg`:

```ini
[settings]
api_url = https://wakapi.gateway.services.apocrathia.com/api
api_key = YOUR_API_KEY
```

Get your API key from the Wakapi web interface after logging in.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n wakapi

# Application logs
kubectl logs -n wakapi deployment/wakapi -f

# Database status
kubectl get cluster -n wakapi

# Check Authentik outpost
kubectl get pods -n authentik | grep wakapi
```

## References

- **[Official Documentation](https://wakapi.dev)** - Hosted service and docs
- **[GitHub Repository](https://github.com/muety/wakapi)** - Source code and configuration reference
- **[WakaTime Plugins](https://wakatime.com/plugins)** - Editor plugin installation guides
