# n8n

Workflow automation platform with visual flow editor and webhook support.

> **Navigation**: [← Back to Management README](../README.md)

## Overview

This deployment uses the local `helm/generic-app` chart for:

- n8n application runtime
- CloudNativePG PostgreSQL cluster
- 1Password item sync for credentials and encryption key
- Authentik proxy provider and outpost
- Gateway access at `https://n8n.gateway.services.apocrathia.com`

## Configuration

Create one 1Password item at `vaults/Secrets/items/n8n-secrets` with:

- `username`
- `password`
- `encryption-key`

The manifests wire these values into database auth and `N8N_ENCRYPTION_KEY`.

## Access

- External: `https://n8n.gateway.services.apocrathia.com`
- In-cluster service: `http://n8n.n8n.svc.cluster.local:80`

## Troubleshooting

```bash
# Deployment status
kubectl get pods,svc,pvc -n n8n

# n8n logs
kubectl logs -n n8n deployment/n8n

# Database cluster status
kubectl get cluster -n n8n n8n-postgres

# Authentik outpost route
kubectl get httproute -n authentik -l ak-outpost=n8n-outpost
```

## References

- [n8n documentation](https://docs.n8n.io/)
- [n8n GitHub](https://github.com/n8n-io/n8n)
- [generic-app chart](../../../../../helm/generic-app/README.md)
