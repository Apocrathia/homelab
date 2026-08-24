# Soularr

Python bridge between Lidarr and Slskd. Reads wanted albums from Lidarr,
searches Soulseek through Slskd, and triggers Lidarr imports when downloads
finish.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Scheduled `soularr.py` loop (default every 300 seconds)
- Built-in web UI on port 8265 (log viewer, failed imports; config is GitOps-managed)
- ConfigMap-mounted `config.ini` with API keys injected from environment variables
- Longhorn volume for `/data` state (logs, failed imports, page cursor)
- SMB mount for `/downloads`, shared with Lidarr and Slskd
- Authentik proxy provider for SSO in front of the web UI

## Access

- **URL**: `https://soularr.gateway.services.apocrathia.com`

## Configuration

Soularr expands `${VAR}` placeholders in `config.ini` at runtime. Static settings
live in `config.ini` (ConfigMap); API keys come from env vars backed by
1Password.

Edit tunable search/release/download settings in `config.ini` and reconcile.
The web UI config editor is read-only because `config.ini` is mounted from a
ConfigMap.

See `helmrelease.yaml` for deployment configuration.

### Secrets

Create a 1Password item at `vaults/Secrets/items/soularr-secrets` with:

| Field            | Value                                            |
| ---------------- | ------------------------------------------------ |
| `lidarr-api-key` | Lidarr → Settings → General → Security           |
| `slskd-api-key`  | Same value as `slskd-api-key` in `slskd-secrets` |

## Authentication

Uses an Authentik proxy provider for SSO. The web UI has no native login.

## Initial setup

1. Create the `soularr-secrets` 1Password item with both API keys.
2. Apply or reconcile the deployment; Flux/Kustomize builds the ConfigMap from
   `config.ini`.
3. Watch the log viewer on the next script interval to verify searches start.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n soularr

# Application logs
kubectl logs -n soularr deployment/soularr -f

# Rendered config (keys redacted in env; check expansion in logs)
kubectl exec -n soularr deployment/soularr -- cat /data/config.ini

# Check Authentik outpost
kubectl get pods -n authentik | grep soularr
```

## References

- **[GitHub Repository](https://github.com/mrusse/soularr)** - Source, Docker
  examples, and config reference
- **[Soularr site](https://soularr.net)** - Project home
