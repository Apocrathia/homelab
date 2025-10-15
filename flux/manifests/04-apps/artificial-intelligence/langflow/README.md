# Langflow

Visual framework for building LLM applications with a drag-and-drop interface for creating flows and agents.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Documentation

- **[Langflow Official Documentation](https://docs.langflow.org)** - Primary documentation source
- **[Langflow GitHub Repository](https://github.com/logspace-ai/langflow)** - Source code and issues
- **[Langflow Helm Charts](https://github.com/langflow-ai/langflow-helm-charts)** - Deployment configuration
- **[Kubernetes Deployment Guide](https://docs.langflow.org/deployment-kubernetes-dev)** - Kubernetes-specific setup

## Overview

This deployment includes:

- Langflow visual flow builder with drag-and-drop interface
- Authentik SSO integration for secure access
- PostgreSQL database for flow storage and metadata
- Longhorn persistent storage for workflows and configuration

## Configuration

### 1Password Secrets

Create a 1Password item:

#### langflow-secrets (`vaults/Secrets/items/langflow-secrets`)

- `username`: PostgreSQL username (e.g., langflow)
- `password`: PostgreSQL password

### Storage

- **Workflows Volume**: 5Gi Longhorn volume for flow storage (`/app/flows`)
- **Configuration Volume**: 2Gi Longhorn volume for config and logs (`/app/config`)
- **Database Storage**: 10Gi Longhorn volume for PostgreSQL data

### Access

- **External URL**: `https://langflow.gateway.services.apocrathia.com`
- **Internal Service**: `http://langflow.langflow.svc.cluster.local:7860`

## Authentication

Authentication is handled entirely through Authentik from deployment:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Automatic Setup**: HTTPRoute and outpost created automatically
3. **Clean Deployment**: Works with Authentik from day one

## Security Considerations

- **SSO Integration**: Complete authentication through Authentik proxy
- **Database Security**: Credentials managed through 1Password secrets
- **Network Policies**: Cilium NetworkPolicy for traffic control

## Troubleshooting

### Common Issues

1. **Database Connection Issues**

   ```bash
   # Check PostgreSQL cluster status
   kubectl -n langflow get cluster langflow-postgres

   # Verify database connectivity
   kubectl -n langflow exec -it langflow-postgres-1 -- psql -U langflow -d langflow -c "SELECT version();"
   ```

2. **Storage Issues**

   ```bash
   # Check PVC status
   kubectl -n langflow get pvc

   # Verify Longhorn availability
   kubectl get storageclass longhorn
   ```

### Health Checks

```bash
# Overall status
kubectl -n langflow get pods,svc,pvc

# Langflow application status
kubectl -n langflow get pods -l app.kubernetes.io/name=langflow

# PostgreSQL cluster status
kubectl -n langflow get cluster langflow-postgres -o wide
```
