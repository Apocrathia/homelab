# Cannery

Self-hosted firearm and ammunition tracker for managing inventory, containers, and shot records.

> **Navigation**: [← Back to Home README](../README.md)

## Overview

This deployment includes:

- PostgreSQL database via CloudNativePG
- Authentik proxy authentication
- Invite-only registration by default

## Access

- **URL**: `https://cannery.gateway.services.apocrathia.com`

## Configuration

Cannery is configured through environment variables in the HelmRelease. The first user created becomes the admin.

See `helmrelease.yaml` for complete deployment configuration.

### Secrets

Create a 1Password item at the path specified in `helmrelease.yaml` with these fields:

- `username` - PostgreSQL database owner
- `password` - PostgreSQL password
- `database-url` - Full Ecto connection string: `ecto://{username}:{password}@cannery-postgres-rw.cannery.svc.cluster.local/cannery`
- `secret-key-base` - Generate with `docker run -it shibaobun/cannery /app/priv/random.sh`

SMTP credentials can be added later if invitation emails are needed (see the [configuration docs](https://github.com/shibaobun/cannery#configuration) for supported env vars).

## Authentication

Uses Authentik proxy provider for SSO. The application also has its own user system with invite-based registration.

## Initial setup

1. Access the web UI through Authentik
2. Create the first user account (becomes admin)
3. Add containers, ammo types, and packs

## Troubleshooting

```bash
# Pod status
kubectl get pods -n cannery

# Application logs
kubectl logs -n cannery deployment/cannery -f

# Database cluster status
kubectl get cluster -n cannery

# Check Authentik outpost
kubectl get pods -n authentik | grep cannery
```

## References

- **[GitHub Repository](https://github.com/shibaobun/cannery)** - Source code mirror
- **[Gitea Repository](https://gitea.bubbletea.dev/shibao/cannery)** - Primary repository
- **[Cannery Website](https://cannery.app/)** - Project homepage
