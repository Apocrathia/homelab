# Semaphore

Web UI and API for running Ansible, Terraform/OpenTofu, PowerShell, and shell
automation from a single place.

> **Navigation**: [← Back to Management README](../README.md)

## Overview

This deployment uses `helm/generic-app` for:

- Semaphore server (`semaphoreui/semaphore`)
- CloudNativePG PostgreSQL
- 1Password-backed secrets
- Authentik OIDC SSO
- Gateway access at `https://semaphore.gateway.services.apocrathia.com`

## Access

- **URL**: `https://semaphore.gateway.services.apocrathia.com`
- In-cluster: `http://semaphore.semaphore.svc.cluster.local:80`

## Configuration

Runtime settings come from environment variables in `helmrelease.yaml`. Day-to-day
project setup (inventories, repos, templates, schedules) is done in the web UI.

### Secrets

Create a 1Password item at `vaults/Secrets/items/semaphore-secrets` with:

| Field                   | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `username`              | PostgreSQL role (CNPG owner + app DB user)                      |
| `password`              | PostgreSQL password                                             |
| `admin-password`        | `SEMAPHORE_ADMIN_PASSWORD` (bootstrap only; see Authentication) |
| `cookie-hash`           | Session cookie signing key                                      |
| `cookie-encryption`     | Session cookie encryption key                                   |
| `access-key-encryption` | Vault/access-key encryption key                                 |
| `oidc-client-id`        | Authentik OIDC client ID (from provider after blueprint apply)  |
| `oidc-client-secret`    | Authentik OIDC client secret                                    |

Generate the three encryption fields with:

```bash
openssl rand -base64 32
```

OIDC provider URL and redirect live in the HelmRelease. Client id/secret are
mounted as files (`client_id_file` / `client_secret_file`).

## Authentication

Authentik OIDC (`authentik.mode: oidc`) with HTTPRoute. Prefer OIDC for day-to-day
access.

OIDC users are created as non-admin on first login. Creating projects and managing
users requires the admin flag (or
`SEMAPHORE_NON_ADMIN_CAN_CREATE_PROJECT=true`). Promote the first operator after
OIDC login:

```bash
kubectl exec -n semaphore deploy/semaphore -- \
  semaphore user list --no-config
kubectl exec -n semaphore deploy/semaphore -- \
  semaphore user change-by-login --login <oidc-login> --admin --no-config
```

`admin-password` in 1Password maps to `SEMAPHORE_ADMIN_PASSWORD` for bootstrap
only. It does not update an existing DB user, and this deploy path may not create
a local `admin` account — use the CLI above when OIDC is the first login.

## Initial setup

1. Create the 1Password item with DB, admin, and encryption fields. Add
   placeholder values for `oidc-client-id` / `oidc-client-secret` so the secret
   keys exist (pod mounts them as files).
2. Apply / wait for Flux reconcile.
3. In Authentik, open application `semaphore` / provider
   `semaphore-oidc-provider`, copy client id and secret into those fields.
4. Restart the Semaphore pod after the OIDC fields update.
5. Sign in via Authentik, promote your OIDC user to admin (see Authentication),
   then create projects and wire inventories/repos in the UI.

## Troubleshooting

```bash
kubectl get pods,svc,pvc,cluster -n semaphore
kubectl logs -n semaphore deployment/semaphore -f
kubectl get httproute -n semaphore
kubectl get configmap -n semaphore authentik-blueprint-semaphore
kubectl exec -n semaphore deploy/semaphore -- semaphore user list --no-config
```

Project create returning **401** with logs like `not permitted to edit users`
usually means the signed-in user is not admin — promote them with
`change-by-login --admin` as above.

Health endpoint: `GET /api/ping` (expects `pong`).

## References

- [Semaphore UI](https://semaphoreui.com/)
- [Semaphore docs](https://semaphoreui.com/docs)
- [OIDC admin guide](https://semaphoreui.com/docs/admin-guide/openid)
- [GitHub](https://github.com/semaphoreui/semaphore)
- [generic-app chart](../../../../../helm/generic-app/README.md)
