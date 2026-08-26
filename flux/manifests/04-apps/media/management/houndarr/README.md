# Houndarr

Polite missing, cutoff, and upgrade searches for Radarr, Sonarr, Lidarr, Readarr, and Whisparr. Small batches and rate limits so indexers do not get hammered.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Houndarr scheduler (SQLite + encrypted \*arr API keys at rest)
- Authentik SSO via proxy provider (app-native proxy auth)
- Longhorn volume for `/data` (database and Fernet master key)

Runs alongside Huntarr2; they solve the same problem with different implementations.

## Access

- **External URL**: `https://houndarr.gateway.services.apocrathia.com`

## Configuration

\*arr instance URLs, API keys, search modes, batch sizes, and cooldowns are set in the web UI after deployment. No bootstrap secrets are required; the encryption master key is created on first start under `/data`.

See `helmrelease.yaml` for deployment configuration.

## Authentication

Authentik proxy provider fronts the app. Houndarr runs with `HOUNDARR_AUTH_MODE=proxy` and reads `X-authentik-username`. Any authenticated user is an admin for Houndarr actions (including factory reset), so keep the Authentik application restricted to operators.

## Initial Setup

1. Open the external URL (Authentik SSO; no local admin setup screen in proxy mode)
2. Add \*arr instances (internal service URLs + API keys) in settings
3. Tune search modes, batch size, and cooldowns

Internal \*arr URLs look like `http://sonarr.sonarr.svc.cluster.local` (service port 80 in this lab).

## Troubleshooting

```bash
# Pod status
kubectl get pods -n houndarr

# Application logs
kubectl logs deployment/houndarr -n houndarr -f

# Health check (pod-local; bypasses Authentik)
kubectl exec deployment/houndarr -n houndarr -- curl -fsS http://localhost:8877/api/health

# Persistent data
kubectl exec deployment/houndarr -n houndarr -- ls -la /data
```

If login loops or 403s appear after SSO, confirm `HOUNDARR_TRUSTED_PROXIES` covers the Authentik outpost pod CIDR.

If the pod crash-loops with `Invalid value for '--port': 'tcp://…'`, Kubernetes service discovery injected `HOUNDARR_PORT`. Keep an explicit `HOUNDARR_PORT=8877` in the HelmRelease env (same pattern as Wakapi).

## References

- **[Houndarr docs](https://av1155.github.io/houndarr/)** - Installation and configuration
- **[GitHub](https://github.com/av1155/houndarr)** - Source and releases
- **[Security overview](https://av1155.github.io/houndarr/docs/security/trust-and-security)** - Trust boundaries and proxy auth
