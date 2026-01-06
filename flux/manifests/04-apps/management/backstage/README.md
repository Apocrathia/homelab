# Backstage

Developer portal for building and managing software catalogs, templates, and documentation.

> **Navigation**: [← Back to Management README](../README.md)

## Documentation

- **[Backstage Documentation](https://backstage.io/docs/)** - Primary documentation
- **[Backstage GitHub](https://github.com/backstage/backstage)** - Source code and issues
- **[Helm Chart](https://github.com/backstage/charts)** - Official Helm chart

## Overview

This deployment includes:

- Software Catalog for tracking services, libraries, and components
- Software Templates (Scaffolder) for project creation
- TechDocs for documentation-as-code
- Plugin architecture for extensibility
- PostgreSQL backend for persistence
- OIDC authentication via Authentik

## Configuration

### 1Password Secrets

Create a 1Password item:

#### backstage-secrets (`vaults/Secrets/items/backstage-secrets`)

- `username`: PostgreSQL username (should be `backstage`)
- `password`: PostgreSQL password
- `oidc-client-id`: Authentik OIDC client ID (from Authentik provider)
- `oidc-client-secret`: Authentik OIDC client secret (from Authentik provider)
- `session-secret`: Random secret for session encryption (generate with `openssl rand -hex 32`)

### Database

- **Engine**: PostgreSQL 17 (CloudNativePG)
- **Connection**: Internal Kubernetes service (`backstage-postgres-rw.backstage.svc.cluster.local`)
- **Credentials**: Managed via 1Password Connect

### Access

- **External URL**: `https://backstage.gateway.services.apocrathia.com`
- **Internal Service**: `http://backstage.backstage.svc.cluster.local:7007`

## Authentication

Authentication is handled through Authentik OIDC:

1. **OIDC Provider**: Authentik OAuth2 provider configured via blueprint
2. **Client Credentials**: Store in 1Password after provider creation
3. **User Matching**: Users matched by email to Backstage user entities

## Troubleshooting

### Common Issues

1. **Database Connection Issues**

   ```bash
   # Check PostgreSQL cluster status
   kubectl get cluster backstage-postgres -n backstage

   # Check pod logs
   kubectl logs -n backstage -l app.kubernetes.io/name=backstage
   ```

2. **OIDC Authentication Issues**

   ```bash
   # Check OIDC client credentials
   kubectl get secret backstage-secrets -n backstage -o jsonpath='{.data.oidc-client-id}' | base64 -d

   # Check Authentik provider exists
   kubectl get configmap -n authentik -l authentik_blueprint=true
   ```

3. **Application Startup Issues**

   ```bash
   # Check health endpoints
   kubectl exec -it -n backstage deployment/backstage -- \
     curl -s http://localhost:7007/.backstage/health/v1/readiness
   ```

### Health Checks

```bash
# Overall status
kubectl get pods,svc,pvc -n backstage

# Backstage application logs
kubectl logs -n backstage -l app.kubernetes.io/name=backstage -f

# PostgreSQL cluster status
kubectl get cluster backstage-postgres -n backstage
```
