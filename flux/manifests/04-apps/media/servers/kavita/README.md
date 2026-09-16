# Kavita

Self-hosted digital library for comics, manga, and ebooks, with a built-in web reader and OPDS support.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Reads CBZ/CBR/ZIP/RAR/7z, EPUB, and PDF files
- Web reader with reading progress, bookmarks, and want-to-read lists
- OPDS feed and KOReader sync for e-reader apps
- Authentik OIDC for SSO, with automatic account provisioning
- Read-only SMB mounts for the Comics, Manga, and Books libraries

## Access

- **URL**: `https://kavita.gateway.services.apocrathia.com`

## Configuration

All configuration happens in the web UI after deployment. Kavita writes its settings to `/kavita/config/appsettings.json` on the config volume, including the OIDC credentials entered during setup.

- **Web UI**: First-run wizard creates the admin account; everything else is dashboard settings
- **TZ**: Set via environment variable in the helmrelease

See `helmrelease.yaml` for complete deployment configuration.

## Authentication

Uses Authentik OIDC, admins-only (admins group binding from the chart). The blueprint creates the provider and application; Kavita stores the client credentials itself, so they are pasted into Kavita once during setup (below). OPDS and API clients authenticate directly with Kavita using per-user API keys, since the HTTPRoute fronts the app without a proxy.

To share with friends later, set `authentik.shared: true` and `tailnet.enabled: true` in the helmrelease (mirrors jellyfin/copyparty).

## Initial Setup

1. Open the URL and complete the first-run wizard to create the admin account.
2. In Authentik, open Applications → kavita → the OIDC provider and copy the Client ID and Client Secret.
3. In Kavita, go to Server Settings → OpenID Connect and enter:
   - Authority: `https://auth.gateway.services.apocrathia.com/application/o/kavita/`
   - Client ID and Client Secret from Authentik
   - Enable provisioning so new SSO logins create accounts
4. Restart the pod so Kavita initializes the OIDC handler: `kubectl rollout restart -n kavita deployment/kavita`
5. Create libraries pointing at `/comics`, `/manga`, and `/books`.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n kavita

# Application logs
kubectl logs -n kavita deployment/kavita -f

# OIDC issues: confirm the provider exists and check blueprint import
kubectl get pods -n authentik | grep -c outpost
kubectl get configmap -n kavita authentik-blueprint-kavita -o yaml | head -5
```

## References

- **[Kavita Documentation](https://wiki.kavitareader.com)** - Primary documentation source
- **[GitHub Repository](https://github.com/Kareadita/Kavita)** - Source code and issues
