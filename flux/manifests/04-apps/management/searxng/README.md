# SearXNG

Privacy-respecting metasearch engine that aggregates results from multiple search providers without tracking users.

> **Navigation**: [← Back to Management README](../README.md)

## Documentation

- **[Official Documentation](https://docs.searxng.org/)** - Primary documentation source
- **[GitHub Repository](https://github.com/searxng/searxng)** - Source code and issues
- **[DeepWiki Documentation](https://deepwiki.com/searxng/searxng)** - Architecture and implementation details

## Overview

This deployment includes:

- **Metasearch Engine**: Aggregates results from 150+ search engines
- **Privacy-Focused**: No user tracking or profiling
- **Authentik Integration**: SSO authentication via proxy provider
- **Persistent Storage**: Configuration and cache data stored in Longhorn volumes

## Configuration

### 1Password Secrets

Create a 1Password item:

#### searxng-secrets (`vaults/Secrets/items/searxng-secrets`)

- `secret-key`: Cryptographic secret key for SearXNG (required). Generate a random string for production use.

### Storage

- **Configuration Volume**: 1Gi Longhorn volume mounted at `/etc/searxng` for settings and configuration files
- **Cache Volume**: 5Gi Longhorn volume mounted at `/var/cache/searxng` for search result caching

### Access

- **External URL**: `https://searxng.gateway.services.apocrathia.com`
- **Internal Service**: `http://searxng.searxng.svc.cluster.local:8080`

## Authentication

Authentication is handled through Authentik proxy provider:

1. **Proxy Provider**: SearXNG is exposed via Authentik outpost in proxy mode
2. **No Built-in Auth**: SearXNG doesn't support OIDC or other authentication methods natively
3. **Header-Based**: Authentik handles authentication and forwards requests to the internal service

See `authentik-blueprint.yaml` for complete Authentik configuration.

## Security Considerations

- **Secret Key**: The `SEARXNG_SECRET` environment variable must be set to a secure random value
- **Public Instance**: Configured for private use; adjust `SEARXNG_PUBLIC_INSTANCE` if deploying publicly
- **Read-Write Filesystem**: Container requires write access to `/etc/searxng` and `/var/cache/searxng` for configuration and caching

## Troubleshooting

### Common Issues

1. **Container Failing to Start**

   ```bash
   # Check pod status
   kubectl get pods -n searxng

   # View logs
   kubectl logs -n searxng -l app=searxng
   ```

2. **Missing Secret Key**

   ```bash
   # Verify secret exists
   kubectl get secret -n searxng searxng-secrets

   # Check secret key field
   kubectl get secret -n searxng searxng-secrets -o jsonpath='{.data.secret-key}' | base64 -d
   ```

3. **Storage Issues**

   ```bash
   # Check PVC status
   kubectl get pvc -n searxng

   # Describe PVC for details
   kubectl describe pvc -n searxng searxng-config
   kubectl describe pvc -n searxng searxng-cache
   ```

### Health Checks

```bash
# Overall status
kubectl get pods,svc,pvc -n searxng

# Service endpoints
kubectl get endpoints -n searxng searxng

# Authentik blueprint status
kubectl get configmap -n searxng authentik-blueprint-searxng
```
