# Chaptarr

Chapter management tool for audiobooks and ebooks. Still in development hell - no public GitHub repo yet.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Chaptarr container with PostgreSQL backend via CNPG
- SMB mounts for books, audiobooks, and downloads
- Authentik SSO integration for secure access
- Longhorn persistent storage for configuration

## Access

- **URL**: `https://chaptarr.gateway.services.apocrathia.com`

## Configuration

Web UI configuration after deployment. PostgreSQL connection is pre-configured via environment variables.

See `helmrelease.yaml` for complete deployment configuration.

### Secrets

Create a 1Password item at `vaults/Secrets/items/chaptarr-secrets` with:

- `username` - PostgreSQL database owner username
- `password` - PostgreSQL database owner password

## Authentication

Uses Authentik proxy provider for SSO.

OIDC is coming™, but we're not going to use it until we have a better understanding of the app and its needs.

## Initial Setup

1. Access the web UI via the Authentik portal
2. Configure media libraries pointing to mounted paths:
   - `/books` - eBooks
   - `/audiobooks` - Audiobooks
   - `/downloads` - Download directory

## Troubleshooting

```bash
# Pod status
kubectl get pods -n chaptarr

# Application logs
kubectl logs -n chaptarr deployment/chaptarr -f

# PostgreSQL status
kubectl get cluster -n chaptarr

# Check Authentik outpost
kubectl get pods -n authentik | grep chaptarr
```

## References

- **[Chaptarr Discord](https://discord.com/invite/63BZhWUG5X)** - Community and updates
- **[Docker Hub](https://hub.docker.com/r/robertlordhood/chaptarr)** - Container images
