# MLflow Deployment

MLflow open-source platform for the machine learning lifecycle deployed with Authentik authentication and PostgreSQL backend.

## Configuration

### 1Password Secrets

Create a 1Password item:

#### mlflow-secrets (`vaults/Secrets/items/mlflow-secrets`)

- `username`: PostgreSQL username (e.g., mlflow)
- `password`: PostgreSQL password

### Authentik Integration

Authentication is handled entirely through Authentik from deployment:

- **No basic auth**: MLflow is configured without built-in authentication
- **Proxy provider**: Authentik blueprint creates a proxy provider that forwards authenticated requests
- **Automatic setup**: HTTPRoute and outpost are created automatically by Authentik
- **Clean deployment**: Works with Authentik from day one, no transitional auth required

**Access MLflow at**: `https://mlflow.gateway.services.apocrathia.com`

**First-time setup**:

1. Access MLflow through Authentik (URL above)
2. Authentik will authenticate you and proxy the request to MLflow
3. MLflow is ready to use through the authenticated interface

### Persistence and Database

- Uses Longhorn storage class for persistent artifact storage
- 50Gi PVC for MLflow artifacts (models, metrics, parameters)
- PostgreSQL database for metadata storage and experiment tracking
- Uses CloudNativePG operator for Kubernetes-native PostgreSQL management
- Database cluster: `mlflow-postgres` with 1 replica
- Database configuration using external PostgreSQL via `backendStore.postgres` section

### PostgreSQL Setup

The PostgreSQL database is automatically managed by CloudNativePG:

1. **Operator**: CloudNativePG operator deployed in `03-services/postgresql`
2. **Cluster**: PostgreSQL cluster `mlflow-postgres` with 1 instance
3. **Connection**: MLflow connects to `mlflow-postgres-rw.mlflow.svc.cluster.local:5432`
4. **Credentials**: Managed through `mlflow-secrets` with `username` and `password` keys
5. **Database Owner**: Set to `mlflow` and managed by CloudNativePG bootstrap
6. **Storage**: 20Gi Longhorn PVC for PostgreSQL data
7. **Image**: `ghcr.io/cloudnative-pg/postgresql:17` (latest stable version)

**PostgreSQL Configuration:**

- `max_connections: "200"` - Maximum concurrent connections (increased for ML workloads)
- `track_io_timing: "on"` - I/O timing statistics
- `track_functions: "all"` - Function execution statistics
- `log_statement: "ddl"` - Log DDL statements
- `log_min_duration_statement: "1000ms"` - Log slow queries (>1s)
- `log_min_messages: "INFO"` - Log level threshold
- `effective_cache_size: "512MB"` - Cache optimization
- `maintenance_work_mem: "64MB"` - Maintenance memory allocation

**Database Features:**

- Automatic failover and high availability
- Built-in monitoring with PodMonitor
- Point-in-time recovery capabilities
- Kubernetes-native backup integration
- Pod anti-affinity for better distribution

### Artifact Storage

- **Local Storage**: 50Gi persistent volume mounted at `/mlflow/artifacts`
- **Storage Class**: Longhorn for high availability and snapshots
- **Future**: Ready for extension to cloud storage (S3, Azure Blob, GCS)

**Storage Configuration:**

- `defaultArtifactRoot: "/mlflow/artifacts"` - Local artifact storage path
- `proxiedArtifactStorage: false` - Direct access to artifacts
- Ready for cloud storage backends when needed

### Resource Usage

- **MLflow**: CPU: 200m-1, Memory: 512Mi-2Gi
- **PostgreSQL**: CPU: 100m-500m, Memory: 256Mi-512Mi
- Single replica deployment for both services
- Optimized for development and medium-scale ML workloads

## Troubleshooting

### Check Deployment Status

```bash
# Overall deployment status
kubectl -n mlflow get pods,svc,pvc
kubectl -n mlflow get cluster

# PostgreSQL cluster status
kubectl -n mlflow get cluster mlflow-postgres -o wide
kubectl -n mlflow get pods -l cnpg.io/cluster=mlflow-postgres

# MLflow application status
kubectl -n mlflow get pods -l app.kubernetes.io/name=mlflow
kubectl -n mlflow get helmrelease mlflow
```

### Check Authentik Outpost

```bash
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost
```

### Common Issues

**Database Connection Issues:**

- Verify PostgreSQL cluster is running: `kubectl -n mlflow get cluster mlflow-postgres`
- Check secret exists: `kubectl -n mlflow get secret mlflow-secrets`
- Verify credentials in 1Password item

**Storage Issues:**

- Verify Longhorn is available: `kubectl get storageclass longhorn`
- Check PVC binding: `kubectl -n mlflow get pvc mlflow-artifacts-pvc`

**Authentication Issues:**

- Test direct access (port-forward): `kubectl -n mlflow port-forward svc/mlflow 5000:80`

## Features

### ML Lifecycle Management

- **Experiment Tracking**: Log parameters, metrics, and artifacts
- **Model Registry**: Centralized model versioning and management
- **Model Deployment**: Deploy models to various targets
- **Model Monitoring**: Track model performance over time

### Integration Capabilities

- **Python SDK**: Full MLflow Python client support
- **AutoLogging**: Automatic experiment tracking for popular ML frameworks
- **REST API**: Programmatic access to all MLflow functionality
- **Model Serving**: Built-in model serving capabilities

### Security Features

- **SSO Integration**: Seamless authentication through Authentik
- **Secret Management**: Secure credential storage with 1Password
- **Audit Logging**: Comprehensive logging of all activities

## Usage Examples

### Basic Experiment Tracking

```python
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error

# Set tracking URI to your MLflow server
mlflow.set_tracking_uri("https://mlflow.gateway.services.apocrathia.com")

# Start an experiment
mlflow.set_experiment("my-experiment")

with mlflow.start_run():
    # Log parameters
    mlflow.log_param("n_estimators", 100)
    mlflow.log_param("max_depth", 6)

    # Train model
    model = RandomForestRegressor(n_estimators=100, max_depth=6)
    model.fit(X_train, y_train)

    # Log metrics
    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    mlflow.log_metric("mse", mse)

    # Log model
    mlflow.sklearn.log_model(model, "model")
```

### Model Registry

```python
import mlflow.sklearn

# Register a model
model_uri = "runs:/<run_id>/model"
mlflow.register_model(model_uri, "MyModel")

# Load and use a registered model
model = mlflow.sklearn.load_model("models:/MyModel/Production")
predictions = model.predict(data)
```
