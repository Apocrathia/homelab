# Endurain

Self-hosted fitness tracking service: activity uploads (GPX/FIT), workouts, body metrics, health stats, and Garmin Connect integration.

> **Navigation**: [← Back to Productivity README](../README.md)

## Overview

This deployment includes:

- Endurain app (single container: FastAPI backend + Vue frontend, port 8080)
- PostgreSQL database via CloudNativePG
- Longhorn volume for activity files and user/server images
- Authentik SSO via OIDC provider (blueprint-generated)

## Access

- **URL**: `https://endurain.gateway.services.apocrathia.com`

## Prerequisites

The pod stays pending until the 1Password item exists. Create
`vaults/Secrets/items/endurain-secrets` with:

| Field        | Description                                       |
| ------------ | ------------------------------------------------- |
| `username`   | PostgreSQL database username (must be `endurain`) |
| `password`   | PostgreSQL database password                      |
| `secret-key` | `openssl rand -hex 32` — JWT/session signing      |
| `fernet-key` | `openssl rand -base64 32` — Fernet encryption     |

The CNPG cluster bootstraps the `endurain` database owner from these
credentials, so `username` must stay `endurain`.

## Configuration

First user registers via the web UI and becomes admin. Everything else
(IdP setup, SMTP, geocoding provider) is configured in the admin UI.

The deployment sets the required startup env vars only (`ENDURAIN_HOST`,
DB credentials, `SECRET_KEY`, `FERNET_KEY`). Redis is not deployed:
rate-limit/auth-security state defaults to in-process memory, which is
correct for a single replica.

## SSO Setup (Authentik)

The blueprint creates the OAuth2 provider and application (slug `endurain`)
with auto-generated client credentials.

1. In Authentik: **Applications → Endurain** → open the provider → copy
   **Client ID** and **Client Secret**
2. In Endurain: **Settings → Identity Providers → Add → Authentik**, with
   slug `authentik`, issuer URL
   `https://auth.gateway.services.apocrathia.com/application/o/endurain/`,
   and the copied credentials
3. Sign out and test the **Sign in with Authentik** button

The pre-registered redirect URI is
`https://endurain.gateway.services.apocrathia.com/api/v1/public/idp/callback/authentik`,
so the IdP slug in Endurain must be `authentik`.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n endurain

# Application logs
kubectl logs -n endurain deployment/endurain -f

# Database status
kubectl get cluster -n endurain
```

Entrypoint rewrites `/app/frontend/dist/env.js` at start; if
`ENDURAIN_HOST` is wrong the frontend API calls fail. Check the rendered
`env.js` with `kubectl exec` if the UI loads but API calls fail.

## References

- **[Official Documentation](https://docs.endurain.com)** - Setup and feature docs
- **[Codeberg Repository](https://codeberg.org/endurain-project/endurain)** - Source code
