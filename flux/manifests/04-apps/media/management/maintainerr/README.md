# Maintainerr

Automated media library management system that identifies and removes stale content from Plex based on configurable rules.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Maintainerr Documentation](https://docs.maintainerr.info)** - Primary documentation source
- **[Maintainerr GitHub](https://github.com/maintainerr/maintainerr)** - Source code and issues

## Overview

This deployment includes:

- Maintainerr media cleanup automation
- Official Maintainerr container
- Authentik SSO integration for secure access
- Longhorn persistent storage for configuration and database

## Features

- **Rule-Based Cleanup**: Configure rules using Plex, Overseerr, Radarr, Sonarr, and Tautulli data
- **Collection Management**: Display "Leaving Soon" collections before deletion
- **Request Cleanup**: Clear outdated requests from Overseerr/Jellyseerr
- **\*Arr Integration**: Unmonitor or remove media from Radarr/Sonarr
- **File Deletion**: Optionally delete files from disk
- **Manual Collections**: Add one-off items that don't match rules

## Configuration

All configuration is done through the web UI after deployment:

1. **Plex Connection**: Configure Plex server URL and authentication
2. **\*Arr Applications**: Add Radarr/Sonarr connections
3. **Overseerr/Jellyseerr**: Configure request management
4. **Tautulli**: Add watch history data source
5. **Rules**: Create cleanup rules based on available parameters

### Access

- **External URL**: `https://maintainerr.gateway.services.apocrathia.com`
- **Internal Service**: `http://maintainerr.maintainerr.svc.cluster.local:80`

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Automatic Setup**: HTTPRoute and outpost created automatically
3. **Clean Deployment**: Works with Authentik from day one

## Integration

Maintainerr integrates with:

- **Plex**: Primary media server for library management
- **Overseerr/Jellyseerr**: Request management and cleanup
- **Radarr/Sonarr**: Movie and TV show management
- **Tautulli**: Watch history and statistics

## Troubleshooting

### Common Issues

1. **Plex Connection Issues**

   ```bash
   # Check Maintainerr logs
   kubectl logs -n maintainerr -l app=maintainerr

   # Verify Plex connectivity
   kubectl exec -n maintainerr deployment/maintainerr -- wget -qO- http://plex:32400/identity
   ```

2. **Data Persistence**

   ```bash
   # Check data volume
   kubectl exec -n maintainerr deployment/maintainerr -- ls -la /opt/data
   ```

### Health Checks

```bash
# Overall status
kubectl get pods,svc,pvc -n maintainerr

# Check Authentik outpost
kubectl get pods -n authentik -l app.kubernetes.io/name=authentik-outpost
```

### Logs

```bash
# Application logs
kubectl logs -n maintainerr -l app=maintainerr -f

# Check for errors
kubectl logs -n maintainerr -l app=maintainerr | grep -i error
```
