# Langfuse

Open-source observability and analytics platform for LLM applications.

## Overview

Langfuse provides comprehensive observability for LLM applications, including tracing, evaluation, and analytics capabilities.

## Configuration

- **Namespace**: `langfuse`
- **External Access**: `https://langfuse.gateway.services.apocrathia.com`
- **Authentication**: OAuth via Authentik (OIDC provider)
- **Storage**: Built-in PostgreSQL, ClickHouse, Redis, and S3/MinIO with Longhorn storage

## Secrets

Secrets are managed via 1Password Item CR (`langfuse-secrets`) and must include:

- `salt`: Random salt for password hashing
- `nextauth-secret`: NextAuth.js secret
- `encryption-key`: Optional encryption key (generate with `openssl rand -hex 32`)
- `postgres-password`: PostgreSQL password
- `clickhouse-password`: ClickHouse password
- `redis-password`: Redis password
- `s3-root-user`: S3/MinIO root user (set to "minio")
- `s3-root-password`: S3/MinIO root password
- `oauth-client-id`: Authentik OAuth client ID (from OIDC provider)
- `oauth-client-secret`: Authentik OAuth client secret (from OIDC provider)
