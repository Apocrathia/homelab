# JetKVM Cloud

Self-hosted JetKVM Cloud API and Dashboard for KVM-over-IP device management.

> **Navigation**: [← Back to Management README](../README.md)

## Overview

- **Cloud API**: Node.js/Express backend with Prisma ORM, WebRTC signaling, and Google OAuth
- **Cloud App**: React frontend for managing JetKVM devices
- **Database**: PostgreSQL via CloudNativePG

## Architecture

```
jetkvm.gateway.services.apocrathia.com
├── /v1/*   → jetkvm-api:3000  (API endpoints)
├── /health → jetkvm-api:3000  (health check)
└── /*      → jetkvm-app:80    (frontend)
```

## Prerequisites

### 1Password Secrets

Create a 1Password item at `vaults/Secrets/items/jetkvm-secrets` with these fields:

| Field                   | Description                              | Required |
| ----------------------- | ---------------------------------------- | -------- |
| `username`              | PostgreSQL username                      | Yes      |
| `password`              | PostgreSQL password                      | Yes      |
| `google-client-id`      | Google OAuth Client ID                   | Yes      |
| `google-client-secret`  | Google OAuth Client Secret               | Yes      |
| `cookie-secret`         | Secure random string for session cookies | Yes      |
| `r2-endpoint`           | S3/R2 endpoint URL                       | No       |
| `r2-access-key-id`      | S3/R2 access key                         | No       |
| `r2-secret-access-key`  | S3/R2 secret key                         | No       |
| `r2-bucket`             | S3/R2 bucket name                        | No       |
| `r2-cdn-url`            | CDN URL for releases                     | No       |
| `cloudflare-turn-id`    | Cloudflare TURN service ID               | No       |
| `cloudflare-turn-token` | Cloudflare TURN API token                | No       |

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to APIs & Services → Credentials
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URI: `https://jetkvm.gateway.services.apocrathia.com/v1/auth/callback`
6. Copy Client ID and Client Secret to 1Password

## Configuration

### Environment Variables

The API is configured with these environment variables:

- `DATABASE_URL`: PostgreSQL connection string (constructed from secrets)
- `API_HOSTNAME`: `https://jetkvm.gateway.services.apocrathia.com`
- `APP_HOSTNAME`: `https://jetkvm.gateway.services.apocrathia.com`
- `CORS_ORIGINS`: `https://jetkvm.gateway.services.apocrathia.com`
- `REAL_IP_HEADER`: `X-Forwarded-For`

### Optional Features

**S3/R2 Storage** (for firmware releases):
Add the `r2-*` fields to your 1Password item and update `api-helmrelease.yaml` to include them.

**WebRTC TURN** (for NAT traversal):
Add `cloudflare-turn-id` and `cloudflare-turn-token` to your 1Password item.

## Image Strategy

Since no official container images exist, this deployment builds from source at runtime:

**API:**

1. Init container clones `jetkvm/cloud-api`, installs deps, builds TypeScript
2. Second init container runs Prisma migrations
3. Main container runs the compiled server

**Frontend:**

1. Init container clones `jetkvm/kvm`, builds production assets with Vite
2. Main container serves static files with nginx

> **Note**: This approach has longer startup times. Consider building and pushing images via CI/CD for production use.

## Database

PostgreSQL is managed by CloudNativePG:

- Cluster: `jetkvm-postgres`
- Service: `jetkvm-postgres-rw.jetkvm.svc.cluster.local:5432`
- Database: `jetkvm`
- Storage: 10Gi Longhorn

Prisma migrations run automatically via init container before the API starts.

## WebSocket Support

The API uses WebSocket for real-time device signaling. Gateway API's HTTPRoute should handle WebSocket upgrades transparently, but verify this works with your Cilium configuration.

## Resources

- [JetKVM Cloud API](https://github.com/jetkvm/cloud-api)
- [JetKVM KVM (includes frontend)](https://github.com/jetkvm/kvm)
- [DeepWiki - Cloud API Docs](https://deepwiki.com/jetkvm/cloud-api)
- [DeepWiki - KVM Docs](https://deepwiki.com/jetkvm/kvm)
