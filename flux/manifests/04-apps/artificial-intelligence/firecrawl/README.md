# Firecrawl

Web scraping API that converts websites into LLM-ready markdown.

## Architecture

| Component  | Image                                         | Port | Purpose                   |
| ---------- | --------------------------------------------- | ---- | ------------------------- |
| API        | `ghcr.io/firecrawl/firecrawl:latest`          | 3002 | Main API server + workers |
| Playwright | `ghcr.io/firecrawl/playwright-service:latest` | 3000 | Browser automation        |
| Redis      | `redis:alpine`                                | 6379 | Job queues, rate limiting |
| RabbitMQ   | `rabbitmq:3-management-alpine`                | 5672 | Message queue             |
| PostgreSQL | `ghcr.io/firecrawl/nuq-postgres:latest`       | 5432 | Logging (with pg_cron)    |

## Deployment

Uses multiple generic-app HelmReleases:

- `firecrawl` - Main API (depends on all supporting services)
- `firecrawl-redis` - Redis for BullMQ
- `firecrawl-rabbitmq` - RabbitMQ for messaging
- `firecrawl-postgres` - PostgreSQL with pg_cron
- `firecrawl-playwright` - Headless browser service

## Access

- **External**: `https://firecrawl.gateway.services.apocrathia.com` (via Authentik)
- **Bull Admin UI**: `https://firecrawl.gateway.services.apocrathia.com/admin/firecrawl-admin/queues`

## Optional Features

Features requiring API keys (not configured):

- `OPENAI_API_KEY` - For extract/LLM features
- `LLAMAPARSE_API_KEY` - PDF extraction

## Resources

- [Firecrawl Docs](https://docs.firecrawl.dev/)
- [GitHub Repository](https://github.com/mendableai/firecrawl)
- [Self-Hosting Guide](https://github.com/mendableai/firecrawl/blob/main/SELF_HOST.md)

## Notes

Official images only publish `latest` tag — no versioned releases.
