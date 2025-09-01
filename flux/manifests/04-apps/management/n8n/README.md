# n8n Deployment

n8n workflow automation platform deployed with Authentik authentication.

## Configuration

### 1Password Secrets

Create a 1Password item:

#### n8n-secrets (`vaults/Secrets/items/n8n-secrets`)

- `username`: PostgreSQL username (e.g., n8n)
- `password`: PostgreSQL password

### Authentik Integration

Authentication is handled entirely through Authentik from deployment:

- **No basic auth**: n8n is configured with `N8N_BASIC_AUTH_ACTIVE=false`
- **Proxy provider**: Authentik blueprint creates a proxy provider that forwards authenticated requests
- **Automatic setup**: HTTPRoute and outpost are created automatically by Authentik
- **Clean deployment**: Works with Authentik from day one, no transitional auth required

**Access n8n at**: `https://n8n.gateway.services.apocrathia.com`

**First-time setup**:

1. Access n8n through Authentik (URL above)
2. Authentik will authenticate you and proxy the request to n8n
3. Set up your initial n8n admin user through the authenticated interface

**Note**: n8n Community Edition works with Authentik proxy providers. For LDAP integration, you would need to configure an LDAP provider in Authentik and set up the appropriate authentication flow. SAML is only available in n8n Enterprise Edition.

### Persistence and Database

- Uses Longhorn storage class for persistent data
- 20Gi PVC for n8n data and workflows (increased from default 8Gi)
- PostgreSQL database for better performance and reliability
- Uses CloudNativePG operator for Kubernetes-native PostgreSQL management
- Database cluster: `n8n-postgres` with 1 replica
- Database configuration using external PostgreSQL via `externalPostgresql` section

### PostgreSQL Setup

The PostgreSQL database is automatically managed by CloudNativePG:

1. **Operator**: CloudNativePG operator deployed in `03-services/postgresql` (v1.27.0)
2. **Cluster**: PostgreSQL cluster `n8n-postgres` with 1 instance
3. **Connection**: n8n connects to `n8n-postgres-rw.n8n.svc.cluster.local:5432`
4. **Credentials**: Managed through `n8n-secrets` with `username` and `password` keys
5. **Database Owner**: Set to `n8n` and managed by CloudNativePG bootstrap
6. **Storage**: 10Gi Longhorn PVC for PostgreSQL data
7. **Image**: `ghcr.io/cloudnative-pg/postgresql:16` (explicitly specified, default would be PostgreSQL 17.5)

**PostgreSQL Configuration:**

- `max_connections: "100"` - Maximum concurrent connections
- `track_io_timing: "on"` - I/O timing statistics
- `track_functions: "all"` - Function execution statistics
- `log_statement: "ddl"` - Log DDL statements
- `log_min_duration_statement: "1000ms"` - Log slow queries (>1s)
- `log_min_messages: "INFO"` - Log level threshold

**Database Features:**

- Automatic failover and high availability
- Built-in monitoring with PodMonitor
- Point-in-time recovery capabilities
- Kubernetes-native backup integration
- Pod anti-affinity for better distribution

**Network Security:**

- Cilium Network Policy for fine-grained traffic control
- Allows n8n application to access PostgreSQL on port 5432
- Allows CloudNativePG operator to access PostgreSQL management port 8000

**Note**: The PostgreSQL username is pulled from the `username` key in the `n8n-secrets` using Flux's `valuesFrom` feature, keeping all credentials in 1Password.

### Resource Usage

- **n8n**: CPU: 100m-500m, Memory: 256Mi-1Gi
- **PostgreSQL**: CPU: 100m-500m, Memory: 256Mi-512Mi
- Single replica deployment for both services

## Troubleshooting

### Check Deployment Status

```bash
# Overall deployment status
kubectl -n n8n get pods,svc,pvc
kubectl -n n8n get cluster

# PostgreSQL cluster status
kubectl -n n8n get cluster n8n-postgres -o wide
kubectl -n n8n get pods -l cnpg.io/cluster=n8n-postgres

# n8n application status
kubectl -n n8n get pods -l app.kubernetes.io/name=n8n
kubectl -n n8n get helmrelease n8n
```

### Check Authentik Outpost

```bash
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost
kubectl -n authentik get httproute -l ak-outpost=n8n-outpost
```

### Check PostgreSQL Operator

```bash
kubectl -n postgres-system get pods -l app.kubernetes.io/name=cloudnative-pg
kubectl -n postgres-system get helmrelease postgres-operator
```

### View Logs

```bash
# n8n logs
kubectl -n n8n logs -l app.kubernetes.io/name=n8n

# PostgreSQL logs
kubectl -n n8n logs -l cnpg.io/cluster=n8n-postgres

# CloudNativePG operator logs
kubectl -n postgres-system logs -l app.kubernetes.io/name=cloudnative-pg
```

### Database Connection Issues

````bash
# Check if PostgreSQL is ready
kubectl -n n8n exec -it n8n-postgres-1 -- psql -U n8n -d n8n -c "SELECT version();"

# Check database connectivity from n8n
kubectl -n n8n exec -it deployment/n8n -- nc -zv n8n-postgres-rw 5432

# Check n8n application logs for authentication issues
kubectl -n n8n logs -l app.kubernetes.io/name=n8n --tail=50

# Check Authentik outpost logs
kubectl -n authentik logs -l app.kubernetes.io/name=authentik-outpost --tail=50

### Authentik Authentication Issues
```bash
# Check if Authentik proxy provider is configured correctly
kubectl get authentikprovider proxyprovider -n n8n

# Check Authentik application configuration
kubectl get authentikapplication -n n8n

# Check if HTTPRoute is properly configured
kubectl get httproute -n authentik -l ak-outpost=n8n-outpost

# Verify proxy provider settings
kubectl get authentikprovider proxyprovider n8n-proxy-provider -n n8n -o yaml
````
