# Immich

Self-hosted photo and video backup solution with powerful machine learning features for face recognition, object detection, and smart search.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Official Documentation](https://immich.app/docs)** - Primary documentation source
- **[GitHub Repository](https://github.com/immich-app/immich)** - Source code and issues
- **[Helm Chart](https://github.com/immich-app/immich-charts)** - Kubernetes deployment

## Overview

This deployment includes:

- **Immich Server**: Core API backend, web UI, and job orchestrator
- **Machine Learning**: ML model inference for face detection and object recognition
- **Valkey**: Redis-compatible cache and job queue
- **PostgreSQL**: Database with vectorchord extension for vector search
- **OIDC Authentication**: Authentik integration for SSO

## Configuration

### 1Password Secrets

Create a 1Password item:

#### immich-secrets (`vaults/Secrets/items/immich-secrets`)

- `username`: PostgreSQL database username (e.g., `immich`)
- `password`: PostgreSQL database password
- `oidc-client-id`: OAuth client ID from Authentik (retrieve after blueprint instantiation)
- `oidc-client-secret`: OAuth client secret from Authentik (retrieve after blueprint instantiation)
- `immich-api-key`: API key for CLI import job (create in Immich UI → User Settings → API Keys)

**Note**: OAuth credentials are injected via Flux `valuesFrom` into the Immich configuration. No manual UI setup required once secrets are populated.

### Storage

- **Library PVC**: SMB-backed (`//storage.services.apocrathia.com/Pictures/Immich`)
- **Import PVC**: SMB-backed for bulk import staging (`Pictures/Immich/import`)
- **ML Cache**: Longhorn volume for machine learning model cache
- **Valkey Data**: Longhorn volume for Redis cache persistence
- **PostgreSQL**: Longhorn volume for database storage

### Access

- **External URL**: `https://immich.gateway.services.apocrathia.com`
- **Internal Service**: `http://immich-server.immich.svc.cluster.local:2283`

## Authentication

Authentication is handled through Authentik OIDC with config-file based setup:

1. **Blueprint Deployment**: Authentik blueprint creates OIDC provider automatically
2. **Retrieve Credentials**: Get client ID/secret from Authentik admin UI → Applications → immich
3. **Update 1Password**: Add `oidc-client-id` and `oidc-client-secret` to the immich-secrets item
4. **Reconcile**: Flux will inject credentials into Immich configuration automatically

OAuth is pre-configured in the HelmRelease with these settings:

- **Issuer URL**: `https://auth.gateway.services.apocrathia.com/application/o/immich/`
- **Scope**: `openid email profile`
- **Auto Register**: Enabled
- **Button Text**: "Sign in with Authentik"

## Bulk Import

A CronJob runs daily at 3 AM to import photos from the SMB share:

- **Source**: `//storage.services.apocrathia.com/Pictures/Immich/import`
- **Behavior**: Recursively uploads all files, deletes after successful upload
- **Concurrency**: 4 parallel uploads

### Manual Import

To trigger an import manually:

```bash
kubectl create job --from=cronjob/immich-import immich-import-manual -n immich
kubectl logs -f job/immich-import-manual -n immich
```

### Test Import

A separate test job manifest (`import-test-job.yaml`) is available for testing. It mounts only the `Pictures/Immich/import/test` subfolder and runs in dry-run mode by default:

```bash
kubectl apply -f import-test-job.yaml
kubectl logs -f job/immich-import-test -n immich
kubectl delete -f import-test-job.yaml
```

## Initial Setup

1. Deploy the manifests and wait for pods to be ready
2. Retrieve OIDC credentials from Authentik and add to 1Password
3. Access Immich web UI - OAuth login should be available
4. Create initial admin account (first user becomes admin)
5. Create an API key (User Settings → API Keys) and add to 1Password as `immich-api-key`
6. Install mobile app and configure server URL

## Troubleshooting

### Common Issues

1. **Database Connection**

   ```bash
   # Check PostgreSQL cluster status
   kubectl get cluster -n immich

   # View database logs
   kubectl logs -n immich -l cnpg.io/cluster=immich-postgres
   ```

2. **Machine Learning Not Working**

   ```bash
   # Check ML pod status and logs
   kubectl get pods -n immich -l app.kubernetes.io/component=machine-learning
   kubectl logs -n immich -l app.kubernetes.io/component=machine-learning
   ```

3. **Storage Issues**

   ```bash
   # Check PVC status
   kubectl get pvc -n immich

   # Verify library mount
   kubectl exec -n immich deploy/immich-server -- ls -la /usr/src/app/upload
   ```

4. **Import Job Issues**

   ```bash
   # Check cronjob status
   kubectl get cronjob -n immich

   # View recent job history
   kubectl get jobs -n immich -l job-name=immich-import

   # Check import job logs
   kubectl logs -n immich -l job-name=immich-import --tail=100
   ```

### Health Checks

```bash
# Overall status
kubectl get pods,svc,pvc -n immich

# HelmRelease status
kubectl get helmrelease -n immich

# Server logs
kubectl logs -n immich -l app.kubernetes.io/component=server
```
