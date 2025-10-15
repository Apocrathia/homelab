# Bazarr

Subtitle management companion for Sonarr and Radarr with automated subtitle downloads.

> **Navigation**: [← Back to Media README](../README.md)

## Documentation

- **[Bazarr Documentation](https://wiki.bazarr.media/)** - Primary documentation source
- **[LinuxServer.io Bazarr](https://docs.linuxserver.io/images/docker-bazarr)** - Container documentation
- **[Bazarr GitHub](https://github.com/morpheus65535/bazarr)** - Source code and issues

## Overview

This deployment includes:

- Bazarr subtitle management with automated downloads
- LinuxServer.io container with standard configuration pattern
- Authentik SSO integration for secure access
- Read-only SMB mounts for media library access
- Longhorn persistent storage for configuration

## Configuration

### Security Configuration

The deployment follows the LinuxServer.io standard pattern:

- Starts as root to initialize user/group mappings
- Switches to PUID/PGID (1000:1000) after initialization
- Privilege escalation enabled for s6-overlay init system
- Required capabilities: SETUID, SETGID, CHOWN, DAC_OVERRIDE
- Writable root filesystem for LinuxServer.io container compatibility

### Storage

- **Configuration Volume**: 5GB Longhorn persistent volume for application configuration
- **Anime Volume**: SMB mount for anime library access (read-only)
- **TV Volume**: SMB mount for TV shows library access (read-only)
- **Movies Volume**: SMB mount for movies library access (read-only)

### Access

- **External URL**: `https://bazarr.gateway.services.apocrathia.com`
- **Internal Service**: `http://bazarr.bazarr.svc.cluster.local:6767`

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Automatic Setup**: HTTPRoute and outpost created automatically
3. **Clean Deployment**: Works with Authentik from day one

## Security Considerations

- **SSO Integration**: Complete authentication through Authentik proxy
- **Read-only Access**: Media libraries mounted as read-only for security
- **LinuxServer.io Pattern**: Standard security context for container compatibility
- **Network Policies**: Cilium NetworkPolicy for traffic control

## Troubleshooting

### Common Issues

1. **Media Library Access**

   ```bash
   # Check anime library access
   kubectl -n bazarr exec -it deployment/bazarr -- ls -la /anime

   # Check TV library access
   kubectl -n bazarr exec -it deployment/bazarr -- ls -la /tv

   # Check movies library access
   kubectl -n bazarr exec -it deployment/bazarr -- ls -la /movies
   ```

2. **Sonarr/Radarr Integration**

   ```bash
   # Check Bazarr logs for integration issues
   kubectl -n bazarr logs deployment/bazarr --tail=50
   ```

### Health Checks

```bash
# Overall status
kubectl -n bazarr get pods,svc,pvc

# Bazarr application status
kubectl -n bazarr get pods -l app.kubernetes.io/name=bazarr

# Check Authentik outpost
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost
```
