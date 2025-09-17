# Ombi

Request management system for Plex media server, allowing users to request movies and TV shows.

## Configuration

- **Image**: LinuxServer.io Ombi container with automatic updates
- **Port**: 3579 (standard Ombi port)
- **Authentication**: SSO through Authentik
- **Storage**: Longhorn for configuration data
- **Resources**: 256Mi-1Gi RAM, 100-500m CPU for web interface

## Access

- **External**: `https://ombi.gateway.services.apocrathia.com`
- **Internal**: `http://ombi.ombi.svc.cluster.local:80`
- **Configuration**: Longhorn volume at `/config`

## Integration

Ombi integrates with Plex and \*arr applications to provide a unified request management system for media acquisition and organization.
