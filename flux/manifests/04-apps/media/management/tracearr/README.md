# Tracearr

Real-time monitoring for Plex, Jellyfin, and Emby — session tracking, analytics, and account-sharing detection in one dashboard.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Upstream Helm chart from [connorgallopo/tracearr](https://github.com/connorgallopo/tracearr) (`docker/helm/tracearr`)
- Tracearr application, TimescaleDB, and Redis as separate workloads
- Longhorn persistence for database, cache, backups, and image cache
- Authentik proxy outpost for external access

## Access

- **URL**: `https://tracearr.gateway.services.apocrathia.com`
- **Internal**: `http://tracearr.tracearr.svc.cluster.local:3000`

## Configuration

- **Web UI**: Connect media servers, rules, and notifications after first login
- **Secrets**: JWT, cookie, and database credentials from 1Password (see `secret.yaml`)
- **Chart source**: Git tag pinned in `gitrepository.yaml`; image tag follows chart `appVersion`

See `helmrelease.yaml` for storage classes and environment overrides.

### Secrets

Create a 1Password item at `vaults/Secrets/items/tracearr-secrets` with:

| Field           | Purpose                                     |
| --------------- | ------------------------------------------- |
| `JWT_SECRET`    | Session signing (`openssl rand -hex 32`)    |
| `COOKIE_SECRET` | Cookie signing (`openssl rand -hex 32`)     |
| `DB_PASSWORD`   | PostgreSQL password for the `tracearr` user |

## Authentication

Tracearr uses local owner accounts (no native OIDC). External access goes through an Authentik **proxy** outpost; you still create the Tracearr owner account in the setup wizard after deployment.

## Initial Setup

1. Create the 1Password item with the required keys above.
2. Apply the manifests and wait for all pods to become ready (TimescaleDB migrations can take a minute).
3. Open the URL and complete the setup wizard (owner account).
4. Add Plex, Jellyfin, and/or Emby servers in Settings.

Optional: import watch history from Tautulli or Jellystat under Settings → Import.

## Troubleshooting

```bash
# Pod status (app, database, cache)
kubectl get pods -n tracearr

# Application logs
kubectl logs -n tracearr deployment/tracearr -f

# Database logs
kubectl logs -n tracearr statefulset/tracearr-timescale -f

# Health endpoint (from a debug pod)
kubectl run -n tracearr curl --rm -it --image=curlimages/curl -- curl -s http://tracearr.tracearr.svc.cluster.local:3000/health

# Authentik outpost
kubectl get pods -n authentik | grep tracearr
```

Tracearr uses WebSocket and SSE for live updates. If streams stall behind the gateway, check Authentik outpost and Gateway timeout settings.

## References

- **[Tracearr Documentation](https://docs.tracearr.com/)** — Setup and configuration
- **[GitHub Repository](https://github.com/connorgallopo/tracearr)** — Source code and Helm chart
