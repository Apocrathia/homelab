# Mealie

Self-hosted recipe manager and meal planning application with comprehensive cooking workflow management.

> **Navigation**: [← Back to Management README](../README.md)

## Documentation

- **[Mealie Documentation](https://docs.mealie.io/)** - Primary documentation source
- **[Mealie GitHub](https://github.com/mealie-recipes/mealie)** - Source code and issues
- **[Backend Configuration](https://docs.mealie.io/documentation/getting-started/installation/backend-config/)** - Configuration reference

## Overview

This deployment includes:

- Recipe management with URL scraping capabilities
- Meal planning with calendar view
- Shopping list generation from meal plans
- Multi-user support with group sharing
- Rich markdown recipe editor
- Full REST API with interactive documentation

## Configuration

### 1Password Secrets

Create a 1Password item:

#### mealie-secrets (`vaults/Secrets/items/mealie-secrets`)

- `oidc-client-id`: Authentik OIDC client ID
- `oidc-client-secret`: Authentik OIDC client secret
- `postgres-password`: PostgreSQL database password
- `smtp-host`: SMTP server hostname
- `smtp-user`: SMTP username
- `smtp-password`: SMTP password

### Storage

- **Application Volume**: 20GB Longhorn persistent volume for application data (`/app/data`)
- **Database Volume**: 10GB Longhorn persistent volume for PostgreSQL data

### Database

- **Engine**: PostgreSQL 16 (CloudNativePG)
- **Connection**: Internal Kubernetes service (`mealie-postgres-rw.mealie.svc.cluster.local`)
- **Credentials**: Managed via 1Password Connect

### Access

- **External URL**: `https://mealie.gateway.services.apocrathia.com`
- **Internal Service**: `http://mealie.mealie.svc.cluster.local:9000`

## Authentication

Authentication is handled through Authentik OIDC:

1. **OIDC Provider**: Authentik OIDC provider configured
2. **Client Credentials**: Automatically generated and stored in 1Password
3. **Password Login**: Disabled when OIDC is enabled
4. **Clean Setup**: Works with Authentik from day one

## Security Considerations

- **OIDC Integration**: Complete authentication through Authentik
- **Password Disabled**: No local password authentication when OIDC is active
- **Database Security**: PostgreSQL credentials managed via 1Password
- **SMTP Security**: Email credentials stored securely in 1Password

## Troubleshooting

### Common Issues

1. **OIDC Authentication Issues**

   ```bash
   # Check OIDC client credentials
   kubectl -n mealie get secret mealie-secrets -o jsonpath='{.data.oidc-client-id}' | base64 -d
   kubectl -n mealie get secret mealie-secrets -o jsonpath='{.data.oidc-client-secret}' | base64 -d

   # Check Authentik provider
   kubectl -n authentik get authentikprovider oauth2provider mealie-oidc-provider
   ```

2. **Database Connection Issues**

   ```bash
   # Check PostgreSQL cluster status
   kubectl -n mealie get cluster mealie-postgres

   # Test database connectivity
   kubectl -n mealie exec -it deployment/mealie -- nc -zv mealie-postgres-rw 5432
   ```

### Health Checks

```bash
# Overall status
kubectl -n mealie get pods,svc,pvc

# Mealie application status
kubectl -n mealie get pods -l app.kubernetes.io/name=mealie

# PostgreSQL cluster status
kubectl -n mealie get cluster mealie-postgres
```
