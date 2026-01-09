# Overseerr

Request management and media discovery tool for Plex, enabling users to request movies and TV shows with automatic integration to Sonarr and Radarr.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Official Documentation](https://docs.overseerr.dev/)** - Primary documentation source
- **[GitHub Repository](https://github.com/sct/overseerr)** - Source code and issues

## Configuration

- **Image**: LinuxServer.io Overseerr container with automatic updates
- **Port**: 5055 (standard Overseerr port)
- **Authentication**: SSO through Authentik proxy, internal auth via Plex OAuth
- **Storage**: Longhorn for configuration data
- **Resources**: Configured in `helmrelease.yaml`

## Access

- **External**: `https://overseerr.gateway.services.apocrathia.com`
- **Internal**: `http://overseerr.overseerr.svc.cluster.local:80`
- **Configuration**: Longhorn volume at `/config`

## Initial Setup

Overseerr requires initial configuration via web UI:

1. Access the external URL
2. Sign in with Plex account (server admin)
3. Configure Plex server connection
4. Add Radarr/Sonarr servers
5. Configure user permissions

## Integration

Overseerr integrates with Plex for authentication and library scanning, and connects to Radarr/Sonarr for automated media acquisition.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n overseerr

# Application logs
kubectl logs -n overseerr deployment/overseerr -f

# Check Authentik outpost
kubectl get pods -n authentik | grep overseerr
```
