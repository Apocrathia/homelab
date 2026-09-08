# Invidious

Invidious is an open-source alternative front-end to YouTube that focuses on privacy and provides a clean user experience without ads, tracking, or JavaScript requirements.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Privacy-focused YouTube frontend without ads or tracking
- **Invidious Companion** for video stream retrieval from YouTube (required for playback)
- Video playback without Google cookies or account requirements
- All video traffic proxied through the instance (`local: true`)
- Comprehensive API for third-party integration
- PostgreSQL database for caching and optional user accounts

## Why the previous deployment failed (do not reintroduce)

The 2025-12 deployment set `public_url` on `invidious_companion` in
`INVIDIOUS_CONFIG`. When `public_url` is set, Invidious sets
`builtin_proxy = false` and hands browsers **direct** video URLs pointing at
`public_url` — which requires a reverse proxy with separate routes for
`/companion/*`. Authentik's proxy provider is single-backend: everything
forwards to Invidious, nothing serves `/companion`. Result: the frontend,
search, and thumbnails worked, but every video stream 404'd.

**Fix**: `public_url` is omitted. Invidious then defaults it to `/companion`
with `builtin_proxy = true` and proxies all video traffic to the sidecar
itself (the documented simple setup). See `src/invidious/config.cr` in
iv-org/invidious for the load-time logic.

## Configuration

### 1Password Secrets

Create a 1Password item:

#### invidious-secrets (`vaults/Secrets/items/invidious-secrets`)

- `database-url`: Full PostgreSQL connection URL
  - Format: `postgres://invidious:<password>@invidious-postgres-rw.invidious.svc.cluster.local:5432/invidious`
  - Replace `<password>` with a strong password (generate with `pwgen 32 1`)
- `hmac-key`: HMAC signing key for tokens and cookies (generate with `pwgen 32 1`)
- `companion-key`: Shared secret for Invidious ↔ Companion communication (must be **exactly 16 characters**, generate with `pwgen 16 1`)

### Invidious Companion

Companion runs as a pod sidecar. The image is pinned by tag and
manifest-list digest in `helmrelease.yaml` (Renovate bumps
`quay.io/invidious/invidious-companion`; companion publishes date-versioned
tags like `2026.09.05-6386b18`). Digests here are the **multi-arch manifest
list** digests, resolved via the quay.io registry API — arch-neutral, so no
Apple Silicon arm64 pitfall. PO token refresh runs hourly via
`JOBS_YOUTUBE_SESSION_FREQUENCY`. If YouTube blocks cluster egress, set
sidecar env `PROXY` per [companion networking config](https://github.com/iv-org/invidious-companion/blob/master/config/config.example.toml).

### Video proxying

`default_user_preferences.local: true` routes all video streams through the
instance (via companion) instead of handing browsers direct googlevideo URLs.
Direct URLs are IP-locked to the requesting server and fail for users, so
proxied is the only reliable mode. Cost: video bandwidth transits the
cluster. This instance is private (SSO-gated, household only), so that is
acceptable.

### Storage

- **PostgreSQL**: 10GB Longhorn persistent volume for database storage
- **No application storage**: Invidious caches data in PostgreSQL

### Access

- **External URL**: `https://invidious.gateway.services.apocrathia.com`
- **Internal Service**: `http://invidious.invidious.svc.cluster.local:80`
- **API**: `https://invidious.gateway.services.apocrathia.com/api/v1/`

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Automatic Setup**: HTTPRoute and outpost created automatically
3. **Local Accounts Disabled**: Registration and login disabled as SSO handles access

## Features

- **Popular Tab**: Enabled for discovering trending content
- **Statistics**: Enabled at `/api/v1/stats`
- **Registration**: Disabled (SSO-only access)
- **Login**: Disabled (SSO-only access)
- **Gatus probe**: `/api/v1/stats` (chart 0.0.76+ stamps gatus annotations)

## Troubleshooting

### Common Issues

1. **Video streams fail but the UI works**

   Check `INVIDIOUS_CONFIG`: `public_url` must NOT be set on
   `invidious_companion` (see "Why the previous deployment failed" above).

2. **PostgreSQL Connection Issues**

   ```bash
   # Check PostgreSQL cluster status
   kubectl -n invidious get cluster invidious-postgres

   # Check PostgreSQL pods
   kubectl -n invidious get pods -l cnpg.io/cluster=invidious-postgres

   # View PostgreSQL logs
   kubectl -n invidious logs -l cnpg.io/cluster=invidious-postgres
   ```

3. **Invidious Application Issues**

   ```bash
   # Check Invidious pod status
   kubectl -n invidious get pods -l app=invidious

   # View application logs
   kubectl -n invidious logs -l app=invidious

   # Check health status
   kubectl -n invidious exec -it deployment/invidious -- wget -qO- http://localhost:3000/api/v1/stats
   ```

4. **Companion restart loops**

   PO token validation against YouTube can saturate the Deno event loop and
   time out healthz probes. This deployment already carries the mitigations:
   hourly `JOBS_YOUTUBE_SESSION_FREQUENCY`, relaxed probes, /var/tmp emptyDir
   cache. If restarts resume, check whether YouTube is blocking cluster
   egress and consider the `PROXY` env.

5. **YouTube rate-limiting / blocking**

   YouTube has been hostile to non-browser traffic from residential IPs.
   Mitigations, in order: wait it out (usually temporary), companion `PROXY`
   env pointing at an external proxy, or Invidious's SOCKS5 proxy support.

### Health Checks

```bash
# Overall status
kubectl -n invidious get pods,svc,pvc,cluster

# Invidious application status
kubectl -n invidious get pods -l app=invidious

# PostgreSQL cluster status
kubectl -n invidious get cluster invidious-postgres

# Check service connectivity
kubectl -n invidious get svc
```

## References

- **[Invidious Documentation](https://docs.invidious.io/)** - Official documentation
- **[Invidious GitHub](https://github.com/iv-org/invidious)** - Source code and issues
- **[Invidious Companion](https://github.com/iv-org/invidious-companion)** - Video stream retrieval sidecar
