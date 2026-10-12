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

Uses Authentik OIDC, admins-only. The Authentik stack (OAuth2 provider, application, `admins` group binding, the `kavita-email-verified-mapping` custom scope mapping) is owned by the file pair — `crossplane.yaml` + `authentik.tf` (Crossplane provider-opentofu workspace, stitched at kustomize build time; the rendered module byte-identical to the HCL). The live blueprint-era objects were adopted in place at the flip gate via `authentik.tf`'s import blocks (the application by slug; generated ids via a gate-time varmap patch, never in git) — steady state reads `No changes` forever. The chart authentik surface is retired (`authentik.enabled: false` in the helmrelease). Kavita stores the client credentials itself, so they are pasted into Kavita once during setup (below); the tofu workdir reads the `kavita-secrets` key `oidc-client-id` in-workdir (ProviderConfig credentials entry) so tofu carries the same live client_id. OPDS and API clients authenticate directly with Kavita using per-user API keys, since the HTTPRoute fronts the app without a proxy.

To share with friends later, add the `users` group binding (order 20) to `authentik.tf` — the file pair is the source of truth now (the chart's `authentik.shared` values key is retired with the blueprint surface).

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

# OIDC issues: check the tofu workspace health
kubectl get workspace -n kavita
kubectl -n kavita get workspace kavita-authentik -o jsonpath='{.status.conditions}' | head -5
```

## References

- **[Kavita Documentation](https://wiki.kavitareader.com)** - Primary documentation source
- **[GitHub Repository](https://github.com/Kareadita/Kavita)** - Source code and issues
