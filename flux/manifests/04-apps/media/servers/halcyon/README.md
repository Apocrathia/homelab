# Halcyon Video

3D "video rental store" front-end for Jellyfin/Plex: every movie is a case on a shelf in a walkable 1990s store. Visitors log into their own Jellyfin or Plex account; the store shelves their libraries, watch history, and watchlists.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Browse-only web store (in-browser 3D) for Jellyfin/Plex libraries
- Server-side Jellyseerr + RomM integration: first-time visitors land in a stocked store with requests and the games department already wired; API keys stay on the server (host-side proxy attaches them, never inlined into the bundle)
- Authentik proxy authentication
- 1Gi Longhorn volume for the Remote Play seed (shared-mirror mode survives restarts)

**Not enabled:** Remote Play _private instances_ (server-rendered WebRTC streams per viewer). That needs a GPU device (`/dev/dri`) and host networking, which generic-app does not support and no workload here uses. The shared-mirror mode (Settings → Connection → Remote Play) still works — it renders on a machine with a display.

## Access

- **URL**: `https://halcyon.gateway.services.apocrathia.com`

## Configuration

- **Web UI**: Media-server login (Jellyfin or Plex) happens in-app, per visitor. Everything else is app-side settings.
- **Environment Variables**: `HALCYON_ALLOWED_HOSTS` (reverse-proxy hostname guard) and the integration URLs/keys in `helmrelease.yaml`.

### Secrets

1Password item `vaults/Secrets/items/halcyon-secrets` (created by the chart as `OnePasswordItem/halcyon-secrets`) with fields:

- `seerr-api-key` — Seerr API key
- `romm-api-key` — RomM credentials as `user:password`

## Authentication

Uses an Authentik proxy provider (tunarr pattern). No HTTPRoute — the outpost handles routing. Anyone reaching the URL logs in via Authentik first; media-server credentials are separate and entered in-app.

## Initial Setup

1. Log in via Authentik, then enter Jellyfin/Plex server URL + credentials in the setup terminal.
2. Optional: flip Settings → Connection → Remote Play on (donates the login for shared-mirror mode).

## Troubleshooting

```bash
# Pod status
kubectl get pods -n halcyon

# Application logs
kubectl logs -n halcyon deployment/halcyon -f

# Check Authentik outpost
kubectl get pods -n authentik | grep halcyon
```

The container keeps `readOnlyRootFilesystem: true`; the two paths that need writes are emptyDir-mounted (`/tmp`, `/app/node_modules/.vite-temp` for vite's startup config file, `/app/feedback` for F8 pins). If a new EROFS path appears in logs, add an emptyDir for it rather than relaxing the security context.

## References

- **[Halcyon Video](https://github.com/halcyon-video/halcyon-video)** - Source, README (deployment matrix, env vars), issues
- **[Live demo](https://halcyon-video.github.io/halcyon-video/)** - Full store on a synthetic library, no server needed
