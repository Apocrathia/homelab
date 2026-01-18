# Ombi

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Request management system for Plex media server
- User-friendly interface for requesting movies and TV shows
- Integration with \*Arr applications for automated media acquisition
- Authentik SSO integration for secure access
- Longhorn persistent storage for configuration

## Configuration

- **Image**: LinuxServer.io Ombi container with automatic updates
- **Port**: 3579 (standard Ombi port)
- **Authentication**: SSO through Authentik
- **Storage**: Longhorn for configuration data
- **Resources**: Configured in `helmrelease.yaml`

## Access

- **External**: `https://ombi.gateway.services.apocrathia.com`
- **Internal**: `http://ombi.ombi.svc.cluster.local:80`
- **Configuration**: Longhorn volume at `/config`

## Integration

Ombi integrates with Plex and \*arr applications to provide a unified request management system for media acquisition and organization.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n ombi

# Application logs
kubectl logs -n ombi deployment/ombi -f

# Check Authentik outpost
kubectl get pods -n authentik | grep ombi
```

## References

- **[Ombi Documentation](https://docs.ombi.app/)** - Official documentation
- **[GitHub Repository](https://github.com/Ombi-app/Ombi)** - Source code and issues
- **[LinuxServer.io Ombi](https://docs.linuxserver.io/images/docker-ombi)** - Container documentation
