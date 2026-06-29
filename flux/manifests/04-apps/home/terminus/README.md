# Terminus

Self-hosted TRMNL BYOS server for managing e-ink devices, playlists, screens, and firmware on your own infrastructure.

> **Navigation**: [← Back to Home README](../README.md)

## Overview

This deployment includes:

- Terminus web app (Puma) with Sidekiq worker sidecar for background jobs
- CloudNative-PG PostgreSQL via `postgres.enabled`
- Valkey for the Sidekiq job queue (`valkey.yaml`)
- Longhorn persistence for uploads and Valkey data
- Authentik proxy for perimeter access with device API paths bypassed

## Access

- **URL**: `https://terminus.gateway.services.apocrathia.com`

## Configuration

Environment variables in `helmrelease.yaml` set the external URL, database connection, and Valkey endpoint. Image generation and device sync jobs run in the Sidekiq sidecar.

### Secrets

Create a 1Password item at `vaults/Secrets/items/terminus-secrets` with:

| Field          | Purpose                                           |
| -------------- | ------------------------------------------------- |
| `username`     | PostgreSQL owner (CNPG bootstrap)                 |
| `password`     | PostgreSQL password (CNPG bootstrap)              |
| `app-secret`   | Session and CSRF signing (`openssl rand -hex 32`) |
| `database-url` | Full connection string for the app                |

`database-url` format:

```text
postgres://<username>:<password>@terminus-postgres-rw.terminus.svc.cluster.local:5432/terminus
```

URL-encode special characters in the password if needed.

## Authentication

**Authentik** handles perimeter access via proxy provider. Device paths bypass Authentik: `/api/`, `/assets/`, `/uploads/`, `/fonts/`, and `/up`. TRMNL devices authenticate with MAC address headers on API routes and fetch screen images from `/uploads/` without SSO.

**Rodauth** is Terminus's built-in user authentication (register, login, sessions). Terminus does not support OIDC or trusted-header SSO, so Authentik cannot replace Rodauth for app-level accounts. After Authentik, you still register or log in inside Terminus. The first registered user is auto-verified and becomes the admin.

## Initial setup

1. Create the 1Password item with all required fields.
2. Apply the manifests and wait for the `terminus` and `terminus-valkey` pods to become ready.
3. Open the URL and complete Authentik login.
4. Click **Register** in Terminus to create the first admin account.
5. Configure TRMNL devices to use `https://terminus.gateway.services.apocrathia.com` as the custom host (must match `API_URI`).

## Troubleshooting

```bash
kubectl get pods -n terminus

kubectl logs -n terminus deployment/terminus -c terminus -f
kubectl logs -n terminus deployment/terminus -c sidekiq -f

kubectl get clusters.postgresql.cnpg.io -n terminus
kubectl get helmreleases -n terminus
```

If images are not generating, check Sidekiq logs. If devices cannot connect, confirm `API_URI` matches the device host and that `/api/` paths are not blocked upstream.

## References

- **[Terminus repository](https://github.com/usetrmnl/terminus)** — source, Docker, and Kubernetes docs
- **[TRMNL](https://trmnl.com)** — hardware and hosted service
- **[Generic-App Chart](../../../../helm/generic-app/README.md)** — deployment template
