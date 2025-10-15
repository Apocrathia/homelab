# n8n

Workflow automation platform with visual flow editor for complex workflows and internal tools.

> **Navigation**: [← Back to Management README](../README.md)

## Documentation

- **[n8n Documentation](https://docs.n8n.io/)** - Primary documentation source
- **[n8n GitHub](https://github.com/n8n-io/n8n)** - Source code and issues
- **[n8n Helm Chart](https://github.com/n8n-io/n8n-helm-chart)** - Deployment configuration

## Overview

This deployment includes:

- n8n workflow automation platform with visual editor
- PostgreSQL database for workflow persistence
- Authentik SSO integration for secure access
- Longhorn persistent storage for data and workflows
- CloudNativePG PostgreSQL cluster management

## Configuration

### 1Password Secrets

Create a 1Password item:

#### n8n-secrets (`vaults/Secrets/items/n8n-secrets`)

- `username`: PostgreSQL username (e.g., n8n)
- `password`: PostgreSQL password

### Storage

- **Application Volume**: 20GB Longhorn persistent volume for n8n data and workflows
- **Database Volume**: 10GB Longhorn persistent volume for PostgreSQL data

### Database

- **Engine**: PostgreSQL 16 (CloudNativePG)
- **Connection**: Internal Kubernetes service (`n8n-postgres-rw.n8n.svc.cluster.local:5432`)
- **Credentials**: Managed via 1Password Connect
- **Features**: Automatic failover, monitoring, point-in-time recovery

### Access

- **External URL**: `https://n8n.gateway.services.apocrathia.com`
- **Internal Service**: `http://n8n.n8n.svc.cluster.local:5678`

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **No Basic Auth**: n8n configured with `N8N_BASIC_AUTH_ACTIVE=false`
3. **Automatic Setup**: HTTPRoute and outpost created automatically
4. **Clean Deployment**: Works with Authentik from day one

## Security Considerations

- **SSO Integration**: Complete authentication through Authentik proxy
- **Database Security**: PostgreSQL credentials managed via 1Password
- **Network Policies**: Cilium NetworkPolicy for traffic control
- **No Local Auth**: Basic authentication disabled for security

## Troubleshooting

### Common Issues

1. **Database Connection Issues**

   ```bash
   # Check PostgreSQL cluster status
   kubectl -n n8n get cluster n8n-postgres

   # Test database connectivity
   kubectl -n n8n exec -it deployment/n8n -- nc -zv n8n-postgres-rw 5432

   # Check database connection from n8n
   kubectl -n n8n exec -it n8n-postgres-1 -- psql -U n8n -d n8n -c "SELECT version();"
   ```

2. **Authentik Authentication Issues**

   ```bash
   # Check Authentik proxy provider
   kubectl get authentikprovider proxyprovider n8n-proxy-provider -n n8n

   # Check Authentik application
   kubectl get authentikapplication -n n8n

   # Check HTTPRoute configuration
   kubectl get httproute -n authentik -l ak-outpost=n8n-outpost
   ```

### Health Checks

```bash
# Overall status
kubectl -n n8n get pods,svc,pvc

# n8n application status
kubectl -n n8n get pods -l app.kubernetes.io/name=n8n

# PostgreSQL cluster status
kubectl -n n8n get cluster n8n-postgres

# Check Authentik outpost
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost
```
