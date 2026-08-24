# Chaptarr

Audiobook and eBook collection manager (Readarr fork). Handles narrator metadata, dual media libraries, and standard \*arr download integrations.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Chaptarr container with PostgreSQL backend via CNPG
- SMB mounts for audiobooks, eBooks, and downloads
- Authentik OIDC (native in-app SSO)
- Longhorn persistent storage for configuration

## Access

- **URL**: `https://chaptarr.gateway.services.apocrathia.com`

## Configuration

Web UI after deployment. PostgreSQL connection is pre-configured via environment variables.

See `helmrelease.yaml` for deployment configuration.

### Secrets

Create a 1Password item at `vaults/Secrets/items/chaptarr-secrets` with:

- `username` — PostgreSQL database owner username
- `password` — PostgreSQL database owner password

## Authentication

Native OIDC against Authentik (`mode: oidc` in `helmrelease.yaml`). Chaptarr stores OIDC settings in `config.xml`; the Helm chart only creates the Authentik OAuth2 provider and HTTPRoute.

- **Redirect URI** (read-only in Chaptarr UI): `https://chaptarr.gateway.services.apocrathia.com/signin-oidc`
- **Authority** (set in Chaptarr UI): `https://auth.gateway.services.apocrathia.com/application/o/chaptarr/` — not the bare Authentik host
- **Email verified**: Authentik blueprint adds a custom email scope mapping with `email_verified: true` for Chaptarr's **Require email verified** option

API-key clients (\*arr stack) authenticate directly; no Authentik proxy.

## Initial setup

1. Copy OAuth2 client ID and secret from Authentik provider `chaptarr-oidc-provider`
2. Open `https://chaptarr.gateway.services.apocrathia.com`
3. Settings → General → Security (or first-run wizard):
   - Authentication method: **OIDC**
   - Authority: `https://auth.gateway.services.apocrathia.com/application/o/chaptarr/`
   - Client ID / secret from Authentik
   - Scopes: `openid profile email`
   - Enable **Require email verified**
4. Root folders:
   - `/audiobooks` — Audiobooks
   - `/ebooks` — eBooks
   - `/downloads` — Download client folder

## Troubleshooting

**OIDC discovery fails (`IDX20803`, authority hits `/.well-known/openid-configuration` on the Authentik root)**
Authority must include the per-provider path: `https://auth.gateway.services.apocrathia.com/application/o/chaptarr/`. The global Authentik discovery URL returns 404.

**Authentik outpost error (`no app for hostname`)**
A leftover proxy outpost from an earlier proxy-mode deploy can still own the hostname. Delete `ak-outpost-chaptarr-outpost` (HTTPRoute, Deployment, Service) in `authentik`. OIDC mode uses HTTPRoute in the `chaptarr` namespace, not an outpost.

**PVC Pending after re-deploy (SMB volumes)**
Retain-policy SMB PVs from a prior install stay in `Released` with a stale `claimRef`. Clear `spec.claimRef` on the PV or delete the orphaned PV object; SMB data on the NAS is unchanged.

```bash
# Pod status
kubectl get pods -n chaptarr

# Application logs
kubectl logs -n chaptarr deployment/chaptarr -f

# PostgreSQL cluster
kubectl get cluster -n chaptarr

# Health check
kubectl exec -n chaptarr deployment/chaptarr -- wget -qO- http://127.0.0.1:8789/ping

# OIDC discovery (expect HTTP 200)
curl -sS -o /dev/null -w '%{http_code}\n' \
  'https://auth.gateway.services.apocrathia.com/application/o/chaptarr/.well-known/openid-configuration'
```

## References

- **[Chaptarr GitHub](https://github.com/Chaptarr/chaptarr)** — Source, releases, and issues
- **[Chaptarr Wiki](https://wiki.chaptarr.com)** — Documentation
- **[Docker Hub](https://hub.docker.com/r/chaptarr/chaptarr)** — Official container image
