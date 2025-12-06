# Shinkro

Application to sync Plex watch status to MyAnimeList automatically.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Shinkro Documentation](https://docs.shinkro.com)** - Primary documentation source
- **[Shinkro GitHub](https://github.com/varoOP/shinkro)** - Source code and issues

## Overview

This deployment includes:

- Automatic sync of Plex watch status to MyAnimeList
- Support for multiple metadata agents (default Plex agent, HAMA, MyAnimeList.bundle)
- Live updates to MyAnimeList as content is watched or rated in Plex
- Web interface for configuration and monitoring
- Authentik SSO integration for secure access

## Configuration

### Storage

- **Configuration Volume**: 5GB Longhorn persistent volume for application configuration and database (`/config`)

### Access

- **External URL**: `https://shinkro.gateway.services.apocrathia.com`
- **Internal Service**: `http://shinkro.shinkro.svc.cluster.local:80`

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Initial Setup**: Complete initial configuration via web UI after first deployment
3. **Plex Integration**: Configured to use internal Plex service URL

## Initial Setup

After deployment, access the web UI to complete configuration:

1. Navigate to `https://shinkro.gateway.services.apocrathia.com`
2. Complete the initial setup wizard
3. Configure Plex connection (uses internal service URL automatically)
4. Authenticate with MyAnimeList using OAuth credentials via the web interface

## Security Considerations

- **SSO Integration**: Complete authentication through Authentik proxy
- **Configuration Storage**: All configuration stored in persistent volume
- **Network Security**: Internal Plex communication via ClusterIP service

## Troubleshooting

### Common Issues

1. **Configuration Not Loading**

   ```bash
   # Check pod status
   kubectl -n shinkro get pods

   # View logs
   kubectl -n shinkro logs -l app.kubernetes.io/name=shinkro
   ```

2. **Plex Connection Issues**

   ```bash
   # Verify Plex service is accessible
   kubectl -n shinkro exec -it deployment/shinkro -- wget -O- http://plex.plex.svc.cluster.local:80

   # Check service endpoints
   kubectl -n plex get svc plex
   ```

3. **MyAnimeList Authentication**

   ```bash
   # Check application logs for authentication errors
   kubectl -n shinkro logs -l app.kubernetes.io/name=shinkro | grep -i "mal\|myanimelist\|auth"
   ```

### Health Checks

```bash
# Overall status
kubectl -n shinkro get pods,svc,pvc

# Check configuration volume
kubectl -n shinkro get pvc
```
