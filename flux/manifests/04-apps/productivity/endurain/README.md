# Endurain

Self-hosted fitness tracking service: activity uploads (GPX/FIT), workouts, body metrics, health stats, and Garmin Connect integration.

> **Navigation**: [← Back to Productivity README](../README.md)

## Overview

This deployment includes:

- Endurain app (single container: FastAPI backend + Vue frontend, port 8080)
- PostgreSQL database via CloudNativePG, with continuous WAL archiving and
  nightly barman base backups to rustfs (`s3://cnpg/endurain`, 14d retention)
- Longhorn volume for activity files and user/server images
- Authentik SSO via OIDC provider (blueprint-generated)

The deployment sets the required startup env vars only (`ENDURAIN_HOST`, DB
credentials, `SECRET_KEY`, `FERNET_KEY`). Redis is not deployed: a single
replica runs rate-limit/auth-security state in-process.

## Access

- **URL**: `https://endurain.gateway.services.apocrathia.com`
- **Front door**: Authentik only — local login is disabled (see below)

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

## Initial Setup

The app ships a seeded local admin. Bootstrap it, wire Authentik, promote the
SSO account, then close the local door — in that order.

1. Log in locally as `admin` / `admin`; change the password immediately
2. Get the provider credentials: Authentik → **Applications → Endurain** →
   open the provider → copy **Client ID** and **Client Secret**
3. Add the IdP: Endurain → **Settings → Identity Providers → Add →
   Authentik** — slug `authentik`, issuer `https://auth.gateway.services.apocrathia.com/application/o/endurain/`,
   pasted credentials. The pre-registered redirect URI is
   `https://endurain.gateway.services.apocrathia.com/api/v1/public/idp/callback/authentik`, so the
   slug must stay `authentik`
4. Enable SSO: **Settings → Server → Authentication** → **Enable SSO/IdP
   authentication**
5. Test the flow in a private window before continuing — the URL must
   round-trip through Authentik and land you in Endurain. First SSO login
   auto-creates the Endurain user from the Authentik email
6. Promote your SSO user: **Settings → Users →** (your user) → access type
   `admin`
7. Disable the seeded `admin` user, then turn **Allow local login** off in
   the Authentication card

## Auth Posture

Live configuration: SSO on, auto-redirect on, local login off. The app URL
starts the OIDC flow immediately — PKCE is generated per session, so there
is no static "start URL" to bookmark. New users are created from their
Authentik email on first login; sign-up is disabled.

If Authentik or the IdP config breaks, re-open local login directly:

```bash
kubectl exec -n endurain endurain-postgres-1 -- psql -U postgres -d endurain \
  -c "UPDATE server_settings SET local_login_enabled = true;"
```

## Troubleshooting

```bash
# Pod status
kubectl get pods -n endurain

# Application logs
kubectl logs -n endurain deployment/endurain -f

# Database status
kubectl get cluster -n endurain

# Backup status (nightly base backups; WAL is continuous)
kubectl get scheduledbackup -n endurain
```

Entrypoint rewrites `/app/frontend/dist/env.js` at start; if
`ENDURAIN_HOST` is wrong the frontend API calls fail. Check the rendered
`env.js` with `kubectl exec` if the UI loads but API calls fail.

## References

- **[Official Documentation](https://docs.endurain.com)** - Setup and feature docs
- **[Codeberg Repository](https://codeberg.org/endurain-project/endurain)** - Source code
