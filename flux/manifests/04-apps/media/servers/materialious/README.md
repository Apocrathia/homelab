# Materialious

Materialious is a modern, material-design frontend for YouTube built on Invidious, with a bundled backend, account system, CORS proxy, and server-side SponsorBlock/DeArrow/Return-YouTube-Dislike support. This deploys the `materialious-full` image, which is its own Deployment and not part of the Invidious app.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Materialious frontend with built-in accounts, subscriptions, watch history, and settings (SQLite)
- Built-in CORS proxy: no reverse-proxy CORS configuration for Invidious is needed
- Server-side fetches for video data, dislikes, SponsorBlock, and DeArrow (upstream defaults: sponsor.ajay.app, returnyoutubedislikeapi.com)
- Default Invidious instance pointed at the in-cluster Invidious service

## Wiring to Invidious

`PUBLIC_DEFAULT_INVIDIOUS_INSTANCE` is `http://invidious.invidious.svc.cluster.local`, the in-cluster service from the [Invidious deployment](../invidious/README.md).

- Materialious fetches video data server-side through its built-in proxy. The public Invidious host is behind Authentik, which would hand the backend a login page instead of API JSON, so the backend must talk to the in-cluster service directly.
- Video stream URLs inside those API responses stay absolute on `https://invidious.gateway.services.apocrathia.com` (Invidious builds them from its `domain` config with `local: true`), so browser playback still transits the public Invidious host with the user's SSO session.
- Invidious Companion needs no `public_url` for this to work: Invidious proxies all video traffic itself (`builtin_proxy`). Setting `public_url` on `invidious_companion` breaks playback behind the single-backend Authentik proxy (see the [Invidious README](../invidious/README.md) for the failure mode).

## Authentication

Materialious runs its own account system (no Authentik SSO gate on this route):

- `PUBLIC_INTERNAL_AUTH: "true"` - built-in users, subscriptions, history, settings
- `PUBLIC_REQUIRE_AUTH: "true"` - data/proxy endpoints require a login
- `PUBLIC_REGISTRATION_ALLOWED: "true"` - **bootstrap value**. Register the operator account, then flip this to `"false"` in `helmrelease.yaml` so only existing users can log in
- Admin: set `PUBLIC_ADMIN_USERNAMES` to the operator's username after registering, if user administration is needed

The app shell serves without a login redirect; only data endpoints are gated.

## 1Password Secrets

Create a 1Password item:

#### materialious-secrets (`vaults/Secrets/items/materialious-secrets`)

- `cookie-secret`: signs authentication cookies, minimum 16 random characters (generate with `openssl rand -hex 32`)

## Storage

- **Data**: 5Gi Longhorn persistent volume mounted at `/materialious-data` holding the SQLite database (`materialious.db`)
- SQLite was chosen over a CNPG cluster because this is a single-replica, low-write account/settings store; no shared PostgreSQL service exists in the cluster to reuse

## Access

- **External URL**: `https://materialious.gateway.services.apocrathia.com`
- **Internal Service**: `http://materialious.materialious.svc.cluster.local:80`
- **Tailnet**: shared via the tailnet gateway, like Invidious

## Notes

- The image is pinned by tag and multi-arch manifest-list digest (Renovate bumps `docker.io/wardpearce/materialious-full`)
- Proof-of-work captcha on registration/login works over HTTPS; leave `PUBLIC_CAPTCHA_DISABLED` unset
- Watch history is culled after 365 days by default (`HISTORY_CULLING`)
- SponsorBlock/DeArrow/RYD defaults are left at upstream values

## Troubleshooting

### Video playback fails but the UI loads

- Check that the Invidious deployment is healthy and its `/api/v1/stats` gatus probe is green
- Check Materialious server logs: the backend reaches Invidious via `http://invidious.invidious.svc.cluster.local`; a NetworkPolicy or Invidious outage shows up as upstream fetch errors
- If streams 404 from the browser, verify the user has a valid Authentik session for `invidious.gateway.services.apocrathia.com` (streams transit the public host)

### Registration is closed / account issues

`PUBLIC_REGISTRATION_ALLOWED` is a plain env value in `helmrelease.yaml`; flip it and let Flux reconcile.

### Database

The SQLite file lives on the `materialious-data` PVC. Restores follow the generic-app Longhorn volume procedure; the file is small (accounts and settings only).

## References

- **[Materialious](https://materialio.us/)** - project site
- **[materialious-full guide](https://github.com/Materialious/Materialious/blob/main/docs/DOCKER-FULL.md)** - upstream env documentation
- **[Materialious source](https://github.com/Materialious/Materialious)** - frontend and backend source
