# Flowise

Drag & drop UI to build customized LLM flows with PostgreSQL backend and Authentik OIDC authentication.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Documentation

- **[Flowise Official Documentation](https://docs.flowiseai.com/)** - Primary documentation source
- **[Flowise GitHub Repository](https://github.com/FlowiseAI/Flowise)** - Source code and issues
- **[Flowise DeepWiki](https://deepwiki.com/FlowiseAI/Flowise)** - In-depth repository documentation

## Overview

This deployment includes:

- Flowise application server for building LLM flows
- PostgreSQL database (CNPG) for data persistence
- Authentik OIDC integration for secure access
- Health checks on `/api/v1/ping` endpoint

## Configuration

### 1Password Secrets

Create a 1Password item:

#### flowise-secrets (`vaults/Secrets/items/flowise-secrets`)

- `username`: PostgreSQL username (e.g., flowise)
- `password`: PostgreSQL password
- `jwt-auth-token-secret`: JWT authentication token secret
- `jwt-refresh-token-secret`: JWT refresh token secret
- `oidc-client-id`: Authentik OIDC client ID (optional, if OIDC is supported)
- `oidc-client-secret`: Authentik OIDC client secret (optional, if OIDC is supported)

### Storage

- **Database Storage**: 10Gi Longhorn volume for PostgreSQL metadata
- **Application Data**: Stored in PostgreSQL database (no additional volumes needed)

### Access

- **External URL**: `https://flowise.gateway.services.apocrathia.com`
- **Internal Service**: `http://flowise.flowise.svc.cluster.local:3000`

## Authentication

Authentication is handled through Authentik OIDC:

1. **OIDC Provider**: Authentik OIDC provider configured via custom blueprint
2. **Application**: Flowise application registered in Authentik
3. **Automatic Setup**: Blueprint creates OIDC provider and application automatically

**Note**: OIDC support may require Flowise Enterprise license. The OIDC redirect URI (`/api/v1/oauth/callback`) may need adjustment based on Flowise's actual OIDC implementation.

## Configuration Method

Flowise can be configured through:

- **Environment Variables**: Database connection, JWT secrets, OIDC settings
- **Web UI**: Application settings and flow configuration after initial deployment

## Security Considerations

- **OIDC Integration**: Authentication through Authentik OIDC provider
- **Database Security**: PostgreSQL credentials managed through 1Password
- **JWT Security**: Token secrets stored securely in 1Password
- **Network Policies**: Cilium NetworkPolicy for traffic control

## Troubleshooting

### Common Issues

1. **Database Connection Issues**

   ```bash
   # Check PostgreSQL cluster status
   kubectl -n flowise get cluster flowise-postgres

   # Verify database connectivity
   kubectl -n flowise exec -it flowise-postgres-1 -- psql -U flowise -d flowise -c "SELECT version();"
   ```

2. **Application Startup Issues**

   ```bash
   # Check pod logs
   kubectl -n flowise logs -l app=flowise

   # Verify health check endpoint
   kubectl -n flowise port-forward svc/flowise 3000:3000
   curl http://localhost:3000/api/v1/ping
   ```

3. **OIDC Authentication Issues**

   ```bash
   # Check OIDC configuration (if OIDC is supported)
   kubectl -n flowise get secret flowise-secrets -o jsonpath='{.data.oidc-client-id}' | base64 -d
   kubectl -n flowise get secret flowise-secrets -o jsonpath='{.data.oidc-client-secret}' | base64 -d

   # Verify Authentik provider
   kubectl -n authentik get authentikprovider oauth2provider flowise-oidc-provider
   ```

### Health Checks

```bash
# Overall status
kubectl -n flowise get pods,svc,pvc

# Flowise application status
kubectl -n flowise get pods -l app=flowise

# PostgreSQL cluster status
kubectl -n flowise get cluster flowise-postgres -o wide

# Health check endpoint
kubectl -n flowise port-forward svc/flowise 3000:3000
curl http://localhost:3000/api/v1/ping
```
