# Lidarr

Music collection manager for Usenet and BitTorrent users with automated RSS monitoring and quality upgrades.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Lidarr Documentation](https://wiki.servarr.com/lidarr)** - Primary documentation source
- **[LinuxServer.io Lidarr](https://docs.linuxserver.io/images/docker-lidarr)** - Container documentation
- **[Lidarr GitHub](https://github.com/Lidarr/Lidarr)** - Source code and issues

## Overview

This deployment includes:

- Lidarr music collection manager with RSS monitoring
- LinuxServer.io container with standard configuration pattern
- Authentik SSO integration for secure access
- SMB mounts for downloads and music library access
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
- **Music Volume**: SMB mount for music library access

### Access

- **External URL**: `https://lidarr.gateway.services.apocrathia.com`
- **Internal Service**: `http://lidarr.lidarr.svc.cluster.local:8686`

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
   kubectl -n lidarr exec -it deployment/lidarr -- mount | grep storage

   # Test download directory access
   kubectl -n lidarr exec -it deployment/lidarr -- ls -la /downloads
   ```

2. **Music Library Access**

   ```bash
   # Check music library access
   kubectl -n lidarr exec -it deployment/lidarr -- ls -la /music
   ```

### Health Checks

```bash
# Overall status
kubectl -n lidarr get pods,svc,pvc

# Lidarr application status
kubectl -n lidarr get pods -l app.kubernetes.io/name=lidarr

# Check Authentik outpost
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost
```
