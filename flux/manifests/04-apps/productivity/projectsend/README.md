# ProjectSend

Client-facing file sharing with per-client portals: clients log in with their
own email and password and see only what has been shared with them. Deployed
alongside copyparty to compare interfaces for the friends-media-contribution
use case; both write to the same `Uploads` SMB share.

> **Navigation**: [← Back to Productivity README](../README.md)

## Overview

This deployment includes:

- ProjectSend (Community edition) — one container running nginx, PHP-FPM, the
  queue worker, and the scheduler under supervisord; health endpoint at `/up`
- MySQL 8.4 (`projectsend-mysql`) — the database ProjectSend requires
  (pdo_mysql; no Postgres support upstream)
- Valkey (`projectsend-valkey`) — sessions, cache, and job queue
- Uploads land on the NAS: the `Uploads` SMB share mounts at `/uploads` and
  an init container symlinks `storage/app/files` → `/uploads` (the entrypoint
  chowns `storage/` recursively, which fails on CIFS; the symlink keeps both
  Laravel's disk root and nginx's X-Accel alias pointing at the share without
  ever chowning it). Files land under `Uploads/ProjectSend/` on the NAS
- MySQL 8.4 (`projectsend-mysql`, 10Gi Longhorn) and Valkey
  (`projectsend-valkey`, 1Gi Longhorn)
- Authentik proxy provider in front, shared with friends over the tailnet;
  the app's own email/password client login sits behind the proxy

## Access

- **URL**: <https://projectsend.gateway.services.apocrathia.com>
- **Friends (tailnet)**: same hostname via the tailnet-gateway parentRef;
  friends log in with the client account created for them in the app
- **On the NAS**: `//storage.services.apocrathia.com/Uploads/ProjectSend/`

## Prerequisite

The `projectsend-secrets` 1Password item must exist with fields
`database-password` and `database-root-password` (referenced by the app and
MySQL releases). First visit shows the setup screen for the administrator
account — operator handles that on deploy.

## Configuration

Everything tunable lives in `helmrelease.yaml` env vars; email, branding,
and client accounts are configured in the app UI (System → Settings). Files
live under `/var/www/html/storage`, which is the SMB-mounted `Uploads` share
— ProjectSend's internal tree (APP_KEY, database-of-record for shares) sits
in the same directory, so treat the subDir as app-owned.

## Troubleshooting

```sh
kubectl -n projectsend logs deploy/projectsend --tail=50
kubectl -n projectsend get pods,pvc
```

- Setup screen errors on database: check `projectsend-mysql` is Ready first
  (first boot is slow by design — the app waits for migrations).
- The container runs as root with a minimal capability set (CHOWN, FOWNER,
  SETUID, SETGID, NET_BIND_SERVICE, DAC_OVERRIDE): the image's supported
  mode — supervisord writes `/run/supervisord.pid`, nginx binds :80, workers
  su-exec down to www-data, and DAC_OVERRIDE lets root write the `.env`
  symlink and nginx state into www-data-owned directories. Breaking those =
  patching the image, not this chart.
- `/up` 200 but login loops: `TRUSTED_PROXIES` mismatch — verify the outpost
  still fronts the app.
