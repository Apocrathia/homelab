# Prowlarr

Indexer manager/proxy for \*arr applications with centralized indexer configuration for torrent trackers and Usenet indexers.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Prowlarr Wiki](https://wiki.servarr.com/prowlarr)** - Primary documentation source
- **[GitHub Repository](https://github.com/Prowlarr/Prowlarr)** - Source code and issues
- **[LinuxServer.io Prowlarr](https://docs.linuxserver.io/images/docker-prowlarr)** - Container documentation

## Configuration

This deployment uses the LinuxServer.io Prowlarr image with the standard LinuxServer.io configuration pattern.

### Key Features

- **LinuxServer.io standard**: Uses root-initiated container with PUID/PGID user switching
- **Persistent storage**: Configuration stored on Longhorn volumes
- **Indexer management**: Centralized indexer configuration for all \*arr applications
- **Flaresolverr integration**: Built-in CloudFlare proxy bypass via sidecar container
- **Authentik integration**: SSO authentication through Authentik
- **Gateway access**: Available at `https://prowlarr.gateway.services.apocrathia.com`

### Security Configuration

The deployment follows the LinuxServer.io standard pattern:

- Starts as root to initialize user/group mappings
- Switches to PUID/PGID (1000:1000) after initialization
- Privilege escalation enabled for s6-overlay init system
- Required capabilities: SETUID, SETGID, CHOWN, DAC_OVERRIDE
- Writable root filesystem for LinuxServer.io container compatibility

### Storage

- **Config volume**: Longhorn persistent volume for application configuration

### Flaresolverr Sidecar

This deployment includes a Flaresolverr sidecar container for CloudFlare proxy bypass:

- **Image**: `ghcr.io/flaresolverr/flaresolverr`
- **Port**: 8191 (internal pod communication only)
- **Purpose**: Bypass CloudFlare protection on indexer sites
- **Access**: Available to Prowlarr at `localhost:8191`
- **Configuration**: Configured with standard settings (LOG_LEVEL=info, CAPTCHA_SOLVER=none)

### Access

Prowlarr is accessible through:

- **Web UI**: `https://prowlarr.gateway.services.apocrathia.com`
- **Authentication**: Managed by Authentik SSO

## Technical Notes

### LinuxServer.io Standard Configuration

This deployment uses the standard LinuxServer.io configuration pattern, which:

1. **Starts as root**: Allows s6-overlay to initialize user/group mappings and directories
2. **Switches to PUID/PGID**: After initialization, runs as user 1000:1000
3. **Full compatibility**: Supports Docker Mods, custom services, and all LinuxServer.io features
4. **Automatic permissions**: Handles volume ownership and permissions automatically

### Integration

Prowlarr serves as the central indexer manager for:

- **Sonarr**: TV show indexer management
- **Radarr**: Movie indexer management
- **Lidarr**: Music indexer management
- **Download clients**: Centralized indexer configuration
- **Indexer providers**: Unified management of torrent trackers and usenet indexers

### Benefits

- **Centralized management**: Single location to configure all indexers
- **Automatic synchronization**: Indexers automatically sync to \*arr applications
- **Simplified setup**: No need to configure indexers in each \*arr application
- **Statistics and monitoring**: Track indexer performance and health

## Troubleshooting

```bash
# Pod status
kubectl get pods -n prowlarr

# Application logs
kubectl logs -n prowlarr deployment/prowlarr -f

# Flaresolverr sidecar logs
kubectl logs -n prowlarr deployment/prowlarr -c flaresolverr -f

# Check Authentik outpost
kubectl get pods -n authentik | grep prowlarr
```
