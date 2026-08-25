# Stoat

Self-hosted [Stoat](https://stoat.chat) chat instance (Revolt fork) — Discord-style
servers, channels, DMs, and file sharing. Messaging only for now; voice/video
(LiveKit) is a planned follow-up.

> **Navigation**: [← Back to Social README](../README.md)

## Overview

Deployed as one `generic-app` HelmRelease per component, wired together with a
single path-routed HTTPRoute:

- `stoat-web` — SolidJS web client (`/`)
- `stoat-api` — REST API (`/api`)
- `stoat-events` — WebSocket event stream (`/ws`)
- `stoat-autumn` — file server (`/autumn`), backed by RustFS over S3
- `stoat-january` — embed/link preview proxy (`/january`)
- `stoat-gifbox` — Tenor GIF proxy (`/gifbox`)
- `stoat-crond` / `stoat-pushd` — task daemon / push notifications (no routes)
- `stoat-mongo`, `stoat-valkey`, `stoat-rabbitmq`, `stoat-rustfs` — backing services

## Access

- **URL**: `https://stoat.gateway.services.apocrathia.com`

## Configuration

- **Config file**: `Revolt.toml` ships as a ConfigMap (`kustomization.yaml`
  generator) mounted at `/Revolt.toml` on every backend service. It carries
  public hostnames and the invite-only registration flag only.
- **Env overrides**: connection strings and credentials are `REVOLT__*`
  environment overrides on each HelmRelease — the config crate merges them over
  the file, same mechanism upstream `secrets.env` uses.
- **Object storage**: RustFS instead of MinIO. Autumn only uses plain S3 calls
  (CreateBucket/Put/Get/Delete) with `path_style_buckets = true`, so no
  virtual-hosted DNS aliases are needed. A one-shot Job creates the
  `revolt-uploads` bucket; it is idempotent and re-verifies on each Flux apply.

See `api.yaml` for the full env override set; other services mirror it.

### Secrets

OnePassword item `stoat-secrets` (see `secret.yaml`) with fields:

- `rabbit-username` / `rabbit-password` — RabbitMQ broker credentials
- `rustfs-access-key` / `rustfs-secret-key` — RustFS S3 credentials
- `files-encryption-key` — autumn file encryption key (`openssl rand -base64 32`);
  losing it loses access to all stored files
- `vapid-private-key` / `vapid-public-key` — Web Push (VAPID) key pair

## Authentication

Stoat manages its own accounts (no Authentik). Registration is invite-only;
create invites directly in MongoDB:

```bash
kubectl exec -n stoat deployment/stoat-mongo -- \
  mongosh --quiet --eval 'db.getSiblingDB("revolt").account_invites.insertOne({ _id: "your_invite_code" })'
```

## Troubleshooting

```bash
# Pod status
kubectl get pods -n stoat

# Backend logs (swap deployment name as needed)
kubectl logs -n stoat deployment/stoat-api -f

# Bucket state in RustFS
kubectl logs -n stoat job/stoat-createbuckets
```

## References

- **[Stoat Self-Hosted](https://github.com/stoatchat/self-hosted)** — upstream compose + guides
- **[Stoat Backend](https://github.com/stoatchat/stoatchat)** — monorepo (config schema in `crates/core/config`)
- **[Generic-App Chart](../../../../helm/generic-app/README.md)** — deployment template
