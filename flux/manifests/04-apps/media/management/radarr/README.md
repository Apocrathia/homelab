# Radarr

Movie collection manager for Usenet and BitTorrent users with automated RSS monitoring and quality upgrades.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Radarr Documentation](https://wiki.servarr.com/radarr)** - Primary documentation source
- **[LinuxServer.io Radarr](https://docs.linuxserver.io/images/docker-radarr)** - Container documentation
- **[Radarr GitHub](https://github.com/Radarr/Radarr)** - Source code and issues

## Overview

This deployment includes:

- Radarr movie collection manager with RSS monitoring
- LinuxServer.io container with standard configuration pattern
- Authentik SSO integration for secure access
- SMB mounts for downloads and movie library access
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

- **Configuration Volume**: Longhorn persistent volume for application configuration
- **Downloads Volume**: SMB mount for download client integration
- **Movies Volume**: SMB mount for movie library access

### Access

- **External URL**: `https://radarr.gateway.services.apocrathia.com`
- **Internal Service**: `http://radarr.radarr.svc.cluster.local:7878`

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
   kubectl -n radarr exec -it deployment/radarr -- mount | grep storage

   # Test download directory access
   kubectl -n radarr exec -it deployment/radarr -- ls -la /downloads
   ```

2. **Movie Library Access**

   ```bash
   # Check movie library access
   kubectl -n radarr exec -it deployment/radarr -- ls -la /movies
   ```

### Health Checks

```bash
# Overall status
kubectl -n radarr get pods,svc,pvc

# Radarr application status
kubectl -n radarr get pods -l app.kubernetes.io/name=radarr

# Check Authentik outpost
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost
```
