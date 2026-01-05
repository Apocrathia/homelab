# CloudNativePG Operator

Kubernetes-native PostgreSQL operator for managing PostgreSQL clusters with enterprise-grade features.

> **Navigation**: [← Back to Services README](../README.md)

## Documentation

- **[CloudNativePG Documentation](https://cloudnative-pg.io/docs/)** - Primary documentation source
- **[GitHub Repository](https://github.com/cloudnative-pg/cloudnative-pg)** - Source code and issues

## Overview

This deployment provides the CloudNativePG operator which enables:

- **Kubernetes-native PostgreSQL management**
- **Automated failover and high availability**
- **Built-in monitoring and metrics**
- **Point-in-time recovery**
- **Declarative cluster configuration**

## Configuration

### Operator Features

- **Cluster-wide mode**: Can manage clusters across all namespaces
- **Monitoring**: PodMonitor integration for Prometheus metrics
- **Security**: Non-root execution with proper security contexts
- **Resource management**: Configurable CPU/memory limits

## Managed Clusters

The operator currently manages:

- **n8n-postgres**: PostgreSQL cluster for n8n workflow automation
  - Longhorn storage
  - Integrated with 1Password secrets
  - Cilium network policies for security

## Monitoring

### Metrics

The operator exposes metrics for:

- PostgreSQL cluster health
- Replication status
- Backup operations
- Resource usage

### Dashboards

Metrics are automatically scraped by Prometheus when `podMonitorEnabled: true`.

## Usage

### Creating a PostgreSQL Cluster

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: my-postgres
  namespace: my-namespace
spec:
  instances: 1
  storage:
    storageClass: longhorn
  bootstrap:
    initdb:
      database: mydb
      owner: myuser
```

See official documentation for complete configuration options including image versions and storage sizing.

### Key Features for Applications

1. **Automatic Service Discovery**

   - Read-write service: `{cluster-name}-rw`
   - Read-only service: `{cluster-name}-ro` (when replicas exist)

2. **High Availability**

   - Automatic failover between instances
   - Self-healing capabilities
   - Rolling updates with minimal downtime

3. **Security**

   - TLS encryption for client connections
   - Certificate management
   - RBAC integration

4. **Backup & Recovery**
   - Point-in-time recovery
   - Automated backup schedules
   - Volume snapshots support

## Troubleshooting

### Check Operator Status

```bash
# Operator deployment status
kubectl -n postgres-system get pods -l app.kubernetes.io/name=cloudnative-pg

# Helm release status (Flux GitOps)
kubectl -n postgres-system get helmrelease postgres-operator

# Flux kustomization status
kubectl get kustomization -A | grep postgres

# Operator logs
kubectl -n postgres-system logs -l app.kubernetes.io/name=cloudnative-pg
```

### Check Managed Clusters

```bash
# List all clusters managed by this operator
kubectl get clusters --all-namespaces

# Get specific cluster status
kubectl -n <namespace> get cluster <cluster-name> -o wide

# Check cluster pods
kubectl -n <namespace> get pods -l cnpg.io/cluster=<cluster-name>
```

### Common Issues

#### Cluster Not Starting

```bash
# Check cluster conditions
kubectl -n <namespace> get cluster <cluster-name> -o yaml

# Check pod events
kubectl -n <namespace> describe pods -l cnpg.io/cluster=<cluster-name>
```

#### Authentication Issues

```bash
# Verify secrets exist
kubectl -n <namespace> get secrets -l cnpg.io/cluster=<cluster-name>

# Check secret contents
kubectl -n <namespace> get secret <secret-name> -o yaml
```

#### Storage Issues

```bash
# Check PVC status
kubectl -n <namespace> get pvc -l cnpg.io/cluster=<cluster-name>

# Check Longhorn volume status
kubectl -n longhorn-system get volumes
```

### Database Connection

```bash
# Connect to database
kubectl -n <namespace> exec -it <pod-name> -- psql -U <username> -d <database>

# Check database status
kubectl -n <namespace> exec -it <pod-name> -- pg_isready -U <username> -d <database>
```

## Security Considerations

1. **Network Policies**: Use CiliumNetworkPolicy for fine-grained access control
2. **Secrets Management**: Store credentials in external secret management (1Password)
3. **RBAC**: Limit cluster access to authorized users
4. **TLS**: Enable TLS for client connections in production

## Integration Examples

### With n8n (Current Setup)

- PostgreSQL cluster: `n8n-postgres`
- Database: `n8n`
- Owner: `n8n` (configured in cluster spec)
- Network security: Cilium policies
- Monitoring: PodMonitor enabled

### Adding More Applications

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: another-app-postgres
  namespace: another-app
spec:
  instances: 2 # For high availability
  storage:
    storageClass: longhorn
  bootstrap:
    initdb:
      database: anotherapp
      owner: anotherapp_user
```

See `helmrelease.yaml` for complete operator configuration.
