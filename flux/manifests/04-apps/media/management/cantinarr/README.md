# Cantinarr

Self-hosted media discovery, requests, and \*arr management (movies, TV, books)
with an AI assistant and MCP tools.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Go server with embedded Flutter web UI on port 8585
- SQLite config and AES-encrypted credentials under `/config`
- Authentik SSO via proxy provider
- Longhorn volume for database and encryption key

## Access

- **URL**: `https://cantinarr.gateway.services.apocrathia.com`

## Configuration

Almost everything is configured in the web UI after the setup wizard (admin
account, Radarr/Sonarr/Chaptarr instances, download clients, AI providers).

Deployment env vars cover timezone, the cluster-internal arr webhook callback,
disabling the GitHub update check, and the MCP OAuth issuer. See
`helmrelease.yaml`.

Push notifications and completed-media library mounts are off until you add
them deliberately.

## Authentication

Uses Authentik proxy provider for SSO. Cantinarr also has its own connect-link /
passkey / password auth for household devices — set **Settings > External
Address** to the gateway URL after first login so invite links resolve correctly.

### MCP

Endpoint: `https://cantinarr.gateway.services.apocrathia.com/mcp`. Authentik
skips `/.well-known/`, `/oauth/`, `/passkeys/`, and `/mcp` so clients can run
Cantinarr's inbound OAuth. There is no static API key — the client registers,
opens the authorize URL, and stores the issued tokens. Enable a password or
passkey on the Cantinarr user used for MCP login.

## Initial Setup

1. Open the external URL and complete the admin setup wizard
2. Set **Settings > External Address** to
   `https://cantinarr.gateway.services.apocrathia.com`
3. Add instances under **Settings > Add Instance** using cluster DNS, e.g.
   `http://radarr.radarr.svc.cluster.local`,
   `http://sonarr.sonarr.svc.cluster.local`,
   `http://chaptarr.chaptarr.svc.cluster.local`
4. Generate connect links for household users

## Troubleshooting

```bash
# Pod status
kubectl get pods -n cantinarr

# Application logs
kubectl logs -n cantinarr deployment/cantinarr -f

# Health endpoint
kubectl exec -n cantinarr deploy/cantinarr -- wget -qO- http://127.0.0.1:8585/api/health

# Authentik outpost
kubectl get pods -n authentik | grep cantinarr
```

## References

- **[GitHub Repository](https://github.com/windoze95/cantinarr)** - Source and docs
- **[cantinarr.com](https://cantinarr.com)** - Project site and roadmap
