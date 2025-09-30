# Langflow

Langflow is a visual framework for building LLM applications with a drag-and-drop interface for creating flows and agents.

## Documentation

- **Langflow Official Documentation**: <https://docs.langflow.org>
- **Langflow GitHub Repository**: <https://github.com/logspace-ai/langflow>
- **Langflow Helm Charts**: <https://github.com/langflow-ai/langflow-helm-charts>
- **Kubernetes Deployment Guide**: <https://docs.langflow.org/deployment-kubernetes-dev>

## Configuration

### 1Password Secrets

Create a 1Password item:

#### langflow-secrets (`vaults/Secrets/items/langflow-secrets`)

- `username`: PostgreSQL username (e.g., langflow)
- `password`: PostgreSQL password

### Authentik Integration

Authentication is handled entirely through Authentik from deployment:

- **Proxy provider**: Authentik blueprint creates a proxy provider that forwards authenticated requests
- **Automatic setup**: HTTPRoute and outpost are created automatically by Authentik
- **Clean deployment**: Works with Authentik from day one, no transitional auth required

**Access Langflow at**: `https://langflow.gateway.services.apocrathia.com`

### Persistence and Database

- **Persistent Storage**: Uses Longhorn storage class for Langflow data persistence
  - `langflow-flows-pvc` (5Gi) - Stores Langflow workflows and flows (`/app/flows`)
  - `langflow-config-pvc` (2Gi) - Stores configuration, logs, and uploaded files (`/app/config`)
- **PostgreSQL Database**: CloudNativePG operator for Kubernetes-native PostgreSQL management
  - Database cluster: `langflow-postgres` with 1 replica
  - Database configuration using external PostgreSQL via `externalDatabase` section

### PostgreSQL Setup

The PostgreSQL database is automatically managed by CloudNativePG:

1. **Operator**: CloudNativePG operator deployed in `03-services/postgresql`
2. **Cluster**: PostgreSQL cluster `langflow-postgres` with 1 instance
3. **Connection**: Langflow connects to `langflow-postgres-rw.langflow.svc.cluster.local:5432`
4. **Credentials**: Managed through `langflow-secrets` with `username` and `password` keys
5. **Database Owner**: Set to `langflow` and managed by CloudNativePG bootstrap
6. **Storage**: 10Gi Longhorn PVC for PostgreSQL data
7. **Image**: `ghcr.io/cloudnative-pg/postgresql:17`

**PostgreSQL Configuration:**

- `max_connections: "100"` - Maximum concurrent connections
- `track_io_timing: "on"` - I/O timing statistics
- `track_functions: "all"` - Function execution statistics
- `log_statement: "ddl"` - Log DDL statements
- `log_min_duration_statement: "1000ms"` - Log slow queries (>1s)
- `log_min_messages: "INFO"` - Log level threshold
- `effective_cache_size: "256MB"` - Cache optimization
- `maintenance_work_mem: "64MB"` - Maintenance memory allocation

**Database Features:**

- Automatic failover and high availability
- Built-in monitoring with PodMonitor
- Point-in-time recovery capabilities
- Kubernetes-native backup integration
- Pod anti-affinity for better distribution
