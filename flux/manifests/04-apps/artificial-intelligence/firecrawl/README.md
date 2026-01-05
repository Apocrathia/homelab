# Firecrawl

Web scraping API that converts websites into LLM-ready markdown.

> **Navigation**: [← Back to AI README](../README.md)

## Documentation

- **[Firecrawl Docs](https://docs.firecrawl.dev/)** - Primary documentation source
- **[GitHub Repository](https://github.com/mendableai/firecrawl)** - Source code and issues
- **[Self-Hosting Guide](https://github.com/mendableai/firecrawl/blob/main/SELF_HOST.md)** - Container deployment

## Overview

This deployment includes multiple generic-app HelmReleases:

- `firecrawl` - Main API (depends on all supporting services)
- `firecrawl-redis` - Redis for BullMQ
- `firecrawl-rabbitmq` - RabbitMQ for messaging
- `firecrawl-postgres` - PostgreSQL with pg_cron
- `firecrawl-playwright` - Headless browser service

**Note**: Official images only publish `latest` tag — no versioned releases.

### Architecture

| Component  | Image                                         | Port | Purpose                   |
| ---------- | --------------------------------------------- | ---- | ------------------------- |
| API        | `ghcr.io/firecrawl/firecrawl:latest`          | 3002 | Main API server + workers |
| Playwright | `ghcr.io/firecrawl/playwright-service:latest` | 3000 | Browser automation        |
| Redis      | `redis:alpine`                                | 6379 | Job queues, rate limiting |
| RabbitMQ   | `rabbitmq:3-management-alpine`                | 5672 | Message queue             |
| PostgreSQL | `ghcr.io/firecrawl/nuq-postgres:latest`       | 5432 | Logging (with pg_cron)    |

## Access

- **External**: `https://firecrawl.gateway.services.apocrathia.com` (via Authentik)
- **Bull Admin UI**: `https://firecrawl.gateway.services.apocrathia.com/admin/firecrawl-admin/queues`

## Configuration

Optional features requiring API keys (not configured by default):

- `OPENAI_API_KEY` - For extract/LLM features
- `LLAMAPARSE_API_KEY` - PDF extraction

See `helmrelease.yaml` for complete deployment configuration.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n firecrawl

# Application logs
kubectl logs -n firecrawl deployment/firecrawl -f

# Check supporting services
kubectl get pods -n firecrawl-redis
kubectl get pods -n firecrawl-rabbitmq
kubectl get pods -n firecrawl-postgres
```
