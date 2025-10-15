# Langfuse

Open-source observability and analytics platform for LLM applications with comprehensive tracing, evaluation, and analytics capabilities.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Documentation

- **[Langfuse Official Documentation](https://langfuse.com/docs)** - Primary documentation source
- **[Langfuse GitHub Repository](https://github.com/langfuse/langfuse)** - Source code and issues
- **[Langfuse Cloud](https://cloud.langfuse.com)** - Hosted service reference

## Overview

This deployment includes:

- Langfuse tracking server for LLM observability
- PostgreSQL database for metadata storage
- ClickHouse database for analytics and metrics
- Redis for caching and session management
- S3/MinIO for artifact storage
- Authentik SSO integration for secure access

## Configuration

### 1Password Secrets

Create a 1Password item:

#### langfuse-secrets (`vaults/Secrets/items/langfuse-secrets`)

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

### Storage

- **PostgreSQL**: Metadata storage and user management
- **ClickHouse**: Analytics and metrics storage
- **Redis**: Caching and session management
- **S3/MinIO**: Artifact storage with Longhorn backend

### Access

- **External URL**: `https://langfuse.gateway.services.apocrathia.com`
- **Internal Service**: `http://langfuse.langfuse.svc.cluster.local:3000`

## Authentication

Authentication is handled through Authentik OAuth (OIDC provider):

1. **OAuth Provider**: Authentik OIDC provider configured
2. **Client Credentials**: Managed through 1Password secrets
3. **Automatic Setup**: OAuth flow handled by Authentik

## Security Considerations

- **OAuth Integration**: Secure authentication through Authentik OIDC
- **Database Security**: All database credentials managed through 1Password
- **Encryption**: Optional encryption key for sensitive data
- **Network Policies**: Cilium NetworkPolicy for traffic control

## Troubleshooting

### Common Issues

1. **Database Connection Issues**

   ```bash
   # Check PostgreSQL status
   kubectl -n langfuse get pods -l app=postgresql

   # Check ClickHouse status
   kubectl -n langfuse get pods -l app=clickhouse

   # Check Redis status
   kubectl -n langfuse get pods -l app=redis
   ```

2. **OAuth Configuration Issues**

   ```bash
   # Check OAuth secrets
   kubectl -n langfuse get secret langfuse-secrets -o yaml

   # View Langfuse logs
   kubectl -n langfuse logs -l app=langfuse
   ```

### Health Checks

```bash
# Overall status
kubectl -n langfuse get pods,svc,pvc

# Langfuse application status
kubectl -n langfuse get pods -l app=langfuse

# Database status
kubectl -n langfuse get pods -l app=postgresql
kubectl -n langfuse get pods -l app=clickhouse
kubectl -n langfuse get pods -l app=redis
```
