# MLflow

Open-source platform for the machine learning lifecycle deployed with Authentik authentication and PostgreSQL backend.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Documentation

- **[MLflow Official Documentation](https://mlflow.org/docs/latest/index.html)** - Primary documentation source
- **[MLflow GitHub Repository](https://github.com/mlflow/mlflow)** - Source code and issues
- **[MLflow Python API](https://mlflow.org/docs/latest/python_api/index.html)** - Python client documentation

## Overview

This deployment includes:

- MLflow tracking server for experiment management
- Model registry for versioning and deployment
- PostgreSQL database for metadata storage
- Longhorn persistent storage for artifacts
- Authentik SSO integration for secure access

## Configuration

### 1Password Secrets

Create a 1Password item:

#### mlflow-secrets (`vaults/Secrets/items/mlflow-secrets`)

- `username`: PostgreSQL username (e.g., mlflow)
- `password`: PostgreSQL password

### Storage

- **Artifacts Storage**: Longhorn volume for model artifacts (`/mlflow/artifacts`) - size configured in `helmrelease.yaml`
- **Database Storage**: Longhorn volume for PostgreSQL metadata - size configured in `helmrelease.yaml`

### Access

- **External URL**: `https://mlflow.gateway.services.apocrathia.com`
- **Internal Service**: `http://mlflow.mlflow.svc.cluster.local:5000`

## Authentication

Authentication is handled entirely through Authentik from deployment:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Automatic Setup**: HTTPRoute and outpost created automatically
3. **Clean Deployment**: Works with Authentik from day one

## Security Considerations

- **SSO Integration**: Complete authentication through Authentik proxy
- **Database Security**: PostgreSQL credentials managed through 1Password
- **Artifact Security**: Model artifacts stored securely on Longhorn volumes
- **Network Policies**: Cilium NetworkPolicy for traffic control

## Troubleshooting

### Common Issues

1. **Database Connection Issues**

   ```bash
   # Check PostgreSQL cluster status
   kubectl -n mlflow get cluster mlflow-postgres

   # Verify database connectivity
   kubectl -n mlflow exec -it mlflow-postgres-1 -- psql -U mlflow -d mlflow -c "SELECT version();"
   ```

2. **Storage Issues**

   ```bash
   # Check PVC status
   kubectl -n mlflow get pvc

   # Verify Longhorn availability
   kubectl get storageclass longhorn
   ```

3. **Authentication Issues**

   ```bash
   # Test direct access (port-forward)
   kubectl -n mlflow port-forward svc/mlflow 5000:80
   ```

### Health Checks

```bash
# Overall status
kubectl -n mlflow get pods,svc,pvc

# MLflow application status
kubectl -n mlflow get pods -l app.kubernetes.io/name=mlflow

# PostgreSQL cluster status
kubectl -n mlflow get cluster mlflow-postgres -o wide
```
