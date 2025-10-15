# Sonarr

Personal Video Recorder (PVR) for Usenet and BitTorrent users with automated episode monitoring and quality upgrades.

> **Navigation**: [← Back to Media README](../README.md)

## Documentation

- **[Sonarr Documentation](https://wiki.servarr.com/sonarr)** - Primary documentation source
- **[LinuxServer.io Sonarr](https://docs.linuxserver.io/images/docker-sonarr)** - Container documentation
- **[Sonarr GitHub](https://github.com/Sonarr/Sonarr)** - Source code and issues

## Overview

This deployment includes:

- Sonarr PVR with RSS feed monitoring
- LinuxServer.io container with standard configuration pattern
- Authentik SSO integration for secure access
- SMB mounts for downloads and media library access
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

- **Configuration Volume**: 10GB Longhorn persistent volume for application configuration
- **Downloads Volume**: SMB mount for download client integration
- **Anime Volume**: SMB mount for anime library access
- **TV Volume**: SMB mount for TV shows library access

### Access

- **External URL**: `https://sonarr.gateway.services.apocrathia.com`
- **Internal Service**: `http://sonarr.sonarr.svc.cluster.local:8989`

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Automatic Setup**: HTTPRoute and outpost created automatically
3. **Clean Deployment**: Works with Authentik from day one

## Security Considerations

- **SSO Integration**: Complete authentication through Authentik proxy
- **LinuxServer.io Pattern**: Standard security context for container compatibility
- **Network Policies**: Cilium NetworkPolicy for traffic control

## Troubleshooting

### Common Issues

1. **Download Client Issues**

   ```bash
   # Check download volume mounts
   kubectl -n sonarr exec -it deployment/sonarr -- mount | grep storage

   # Test download directory access
   kubectl -n sonarr exec -it deployment/sonarr -- ls -la /downloads
   ```

2. **Media Library Access**

   ```bash
   # Check TV library access
   kubectl -n sonarr exec -it deployment/sonarr -- ls -la /tv

   # Check anime library access
   kubectl -n sonarr exec -it deployment/sonarr -- ls -la /anime
   ```

### Health Checks

```bash
# Overall status
kubectl -n sonarr get pods,svc,pvc

# Sonarr application status
kubectl -n sonarr get pods -l app.kubernetes.io/name=sonarr

# Check Authentik outpost
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost
```
