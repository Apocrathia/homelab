# Invidious

Invidious is an open-source alternative front-end to YouTube that focuses on privacy and provides a clean user experience without ads, tracking, or JavaScript requirements.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Invidious DeepWiki](https://deepwiki.com/iv-org/invidious)** - Primary documentation source
- **[Invidious GitHub](https://github.com/iv-org/invidious)** - Source code and issues
- **[Invidious Documentation](https://docs.invidious.io/)** - Official documentation

## Overview

This deployment includes:

- Privacy-focused YouTube frontend without ads or tracking
- **Invidious Companion** for video stream retrieval from YouTube
- Video playback without Google cookies or account requirements
- Audio-only mode with background play support
- Comprehensive API for third-party integration
- PostgreSQL database for caching and optional user accounts

## Configuration

### 1Password Secrets

Create a 1Password item:

#### invidious-secrets (`vaults/Secrets/items/invidious-secrets`)

- `database-url`: Full PostgreSQL connection URL
  - Format: `postgres://invidious:<password>@invidious-postgres-rw.invidious.svc.cluster.local:5432/invidious`
  - Replace `<password>` with a strong password (generate with `pwgen 32 1`)
- `hmac-key`: HMAC signing key for tokens and cookies (generate with `pwgen 32 1`)
- `companion-key`: Shared secret for Invidious ↔ Companion communication (must be **exactly 16 characters**, generate with `pwgen 16 1`)

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

## Troubleshooting

### Common Issues

1. **PostgreSQL Connection Issues**

   ```bash
   # Check PostgreSQL cluster status
   kubectl -n invidious get cluster invidious-postgres

   # Check PostgreSQL pods
   kubectl -n invidious get pods -l cnpg.io/cluster=invidious-postgres

   # View PostgreSQL logs
   kubectl -n invidious logs -l cnpg.io/cluster=invidious-postgres
   ```

2. **Invidious Application Issues**

   ```bash
   # Check Invidious pod status
   kubectl -n invidious get pods -l app=invidious

   # View application logs
   kubectl -n invidious logs -l app=invidious

   # Check health status
   kubectl -n invidious exec -it deployment/invidious -- wget -qO- http://localhost:3000/api/v1/stats
   ```

3. **Database Table Issues**

   ```bash
   # Invidious should auto-create tables with check_tables: true
   # If issues persist, check logs for SQL errors
   kubectl -n invidious logs -l app=invidious | grep -i "error\|sql"
   ```

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
