# Huntarr

Automated missing content hunter for \*arr applications that systematically searches for missing content in existing libraries.

> **Navigation**: [← Back to Media README](../README.md)

## Documentation

- **[Huntarr Documentation](https://deepwiki.com/plexguide/Huntarr.io)** - Primary documentation source
- **[Huntarr GitHub](https://github.com/plexguide/Huntarr.io)** - Source code and issues

## Overview

This deployment includes:

- Huntarr automated missing content hunter
- Python-based container with non-root security context
- Authentik SSO integration for secure access
- Longhorn persistent storage for configuration and SQLite database

## Configuration

### Security Configuration

The deployment uses a non-root security context:

- Runs as UID/GID 1000 (non-root user)
- Writable root filesystem for Python application requirements
- No privilege escalation required
- Standard container security practices

### Storage

- **Configuration Volume**: 5GB Longhorn persistent volume for application configuration and SQLite database

### Access

- **External URL**: `https://huntarr.gateway.services.apocrathia.com`
- **Internal Service**: `http://huntarr.huntarr.svc.cluster.local:9705`

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Automatic Setup**: HTTPRoute and outpost created automatically
3. **Clean Deployment**: Works with Authentik from day one

## Security Considerations

- **SSO Integration**: Complete authentication through Authentik proxy
- **Non-Root Container**: Standard security context for Python applications
- **Network Policies**: Cilium NetworkPolicy for traffic control

## Troubleshooting

### Common Issues

1. **Configuration Directory Access**

   ```bash
   # Check config volume mount
   kubectl -n huntarr exec -it deployment/huntarr -- mount | grep config

   # Test config directory access
   kubectl -n huntarr exec -it deployment/huntarr -- ls -la /config
   ```

2. **Database File Permissions**

   ```bash
   # Check database file ownership
   kubectl -n huntarr exec -it deployment/huntarr -- ls -la /config/huntarr.db
   ```

### Health Checks

```bash
# Overall status
kubectl -n huntarr get pods,svc,pvc

# Huntarr application status
kubectl -n huntarr get pods -l app.kubernetes.io/name=huntarr

# Check Authentik outpost
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost | grep huntarr
```
