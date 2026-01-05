# Windmill

Open-source developer platform for building internal tools, workflows, and scripts.

> **Navigation**: [← Back to Management README](../README.md)

## Documentation

- **[Windmill Documentation](https://www.windmill.dev/docs)** - Primary documentation source
- **[Helm Chart](https://github.com/windmill-labs/windmill-helm-charts)** - Kubernetes deployment

## Overview

This deployment provides:

- **Scripts**: Python, TypeScript, Go, Bash, SQL execution
- **Flows**: DAG-based workflows with branching and error handling
- **Apps**: Low-code UI builder for internal dashboards
- **Schedules**: Cron-based triggers

## Configuration

### Database

Uses CloudNativePG (CNPG) for PostgreSQL. Connection is configured via `databaseUrl` in the HelmRelease, pulled from 1Password secrets.

### Authentication

Windmill has native SSO support including Authentik. Configure via the Windmill UI:

1. Navigate to Instance Settings → Auth/OAuth/SAML
2. Select Authentik provider
3. Enter your Authentik organization URL, Client ID, and Client Secret

Note: SSO is limited to 10 users on the open-source edition.

### Networking

Exposed via Gateway API at `windmill.gateway.services.apocrathia.com`. TLS termination handled by the gateway.

### Worker Groups

Two worker groups are configured:

- **default**: General purpose workers with full isolation
- **native**: Lightweight workers for native scripts (faster startup)

Scale replicas as needed in `helmrelease.yaml`.

## Workflow Code

The `scripts/` directory is intended for storing Windmill workflow definitions that can be synced via:

- **Windmill Git Sync**: Configure in Windmill UI to watch this directory
- **wmill CLI**: Run `wmill sync push` manually or in CI

## Initial Setup

1. Access Windmill at `https://windmill.gateway.services.apocrathia.com`
2. Create initial admin account
3. Configure SSO if desired
4. Set up git sync for declarative workflow management

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n windmill

# View app logs
kubectl logs -n windmill -l app.kubernetes.io/component=app

# View worker logs
kubectl logs -n windmill -l app.kubernetes.io/component=worker

# Check database connectivity
kubectl exec -it -n windmill deploy/windmill-app -- printenv DATABASE_URL
```
