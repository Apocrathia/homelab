# CloudNativePG Operator

Kubernetes-native PostgreSQL operator for managing PostgreSQL clusters.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

This deployment provides the CloudNativePG operator:

- Kubernetes-native PostgreSQL management
- Automated failover and high availability
- Built-in monitoring and metrics
- Point-in-time recovery
- Declarative cluster configuration

## Configuration

### Operator features

- Cluster-wide mode: manages clusters across all namespaces
- Monitoring: PodMonitor integration for Prometheus metrics
- Security: non-root execution with security contexts
- Resource management: configurable CPU/memory limits

## Managed Clusters

The operator is cluster-wide: every PostgreSQL cluster is defined next to
the app that owns it (a `postgres.yaml` in the app's directory, e.g.
[`03-services/authentik/`](../authentik/)), never here. No central inventory
is kept in docs; it would drift. `kubectl get cluster -A` or a repo search
for `postgresql.cnpg.io/v1` shows the current set.

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

### Adding an Application

Create a `Cluster` (`postgresql.cnpg.io/v1`) in the consuming app's own
directory: instances, storage, and bootstrap live in that manifest; see an
existing app's `postgres.yaml` for the pattern. The [CloudNativePG
documentation](https://cloudnative-pg.io/docs/) covers the full spec.

### Key features for applications

1. Automatic service discovery: read-write service `{cluster-name}-rw`,
   read-only service `{cluster-name}-ro` (when replicas exist)
2. High availability: automatic failover between instances, self-healing,
   rolling updates with minimal downtime
3. Security: TLS encryption for client connections, certificate management,
   RBAC integration
4. Backup and recovery: point-in-time recovery, automated backup schedules,
   volume snapshots

## Troubleshooting

### Check operator status

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

### Check managed clusters

```bash
# List all clusters managed by this operator
kubectl get clusters --all-namespaces

# Get specific cluster status
kubectl -n <namespace> get cluster <cluster-name> -o wide

# Check cluster pods
kubectl -n <namespace> get pods -l cnpg.io/cluster=<cluster-name>
```

### Common issues

**Cluster not starting**

```bash
# Check cluster conditions
kubectl -n <namespace> get cluster <cluster-name> -o yaml

# Check pod events
kubectl -n <namespace> describe pods -l cnpg.io/cluster=<cluster-name>
```

**Authentication issues**

```bash
# Verify secrets exist
kubectl -n <namespace> get secrets -l cnpg.io/cluster=<cluster-name>

# Check secret contents
kubectl -n <namespace> get secret <secret-name> -o yaml
```

**Storage issues**

```bash
# Check PVC status
kubectl -n <namespace> get pvc -l cnpg.io/cluster=<cluster-name>

# Check Longhorn volume status
kubectl -n longhorn-system get volumes
```

### Database connection

```bash
# Connect to database
kubectl -n <namespace> exec -it <pod-name> -- psql -U <username> -d <database>

# Check database status
kubectl -n <namespace> exec -it <pod-name> -- pg_isready -U <username> -d <database>
```

## References

- **[CloudNativePG Documentation](https://cloudnative-pg.io/docs/)** - Primary documentation source
- **[GitHub Repository](https://github.com/cloudnative-pg/cloudnative-pg)** - Source code and issues

## Security considerations

1. Use CiliumNetworkPolicy for fine-grained access control
2. Store credentials in 1Password
3. Limit cluster access to authorized users
4. Enable TLS for client connections in production

See `helmrelease.yaml` for complete operator configuration.
