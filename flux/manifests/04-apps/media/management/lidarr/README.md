# Lidarr

Lidarr is a music collection manager for Usenet and BitTorrent users. It can monitor multiple RSS feeds for new albums from your favorite artists and will interface with clients and indexers to grab, sort, and rename them. It can also be configured to automatically upgrade the quality of existing files in the library when a better quality format becomes available.

## Configuration

This deployment uses the LinuxServer.io Lidarr image with the standard LinuxServer.io configuration pattern.

### Key Features

- **LinuxServer.io standard**: Uses root-initiated container with PUID/PGID user switching
- **Persistent storage**: Configuration stored on Longhorn volumes
- **Media access**: SMB mounts for downloads and music libraries
- **Authentik integration**: SSO authentication through Authentik
- **Gateway access**: Available at `https://lidarr.gateway.services.apocrathia.com`

### Security Configuration

The deployment follows the LinuxServer.io standard pattern:

- Starts as root to initialize user/group mappings
- Switches to PUID/PGID (1000:1000) after initialization
- Privilege escalation enabled for s6-overlay init system
- Required capabilities: SETUID, SETGID, CHOWN, DAC_OVERRIDE
- Writable root filesystem for LinuxServer.io container compatibility

### Storage

- **Config volume**: 10GB Longhorn persistent volume for application configuration
- **Downloads volume**: SMB mount for download client integration
- **Music volume**: SMB mount for music library access

### Access

Lidarr is accessible through:

- **Web UI**: `https://lidarr.gateway.services.apocrathia.com`
- **Authentication**: Managed by Authentik SSO

## Technical Notes

### LinuxServer.io Standard Configuration

This deployment uses the standard LinuxServer.io configuration pattern, which:

1. **Starts as root**: Allows s6-overlay to initialize user/group mappings and directories
2. **Switches to PUID/PGID**: After initialization, runs as user 1000:1000
3. **Full compatibility**: Supports Docker Mods, custom services, and all LinuxServer.io features
4. **Automatic permissions**: Handles volume ownership and permissions automatically

### Integration

Lidarr integrates with other media management applications:

- **Download clients**: Configured to access downloads via SMB mount
- **Music libraries**: Direct access to music libraries
- **Music servers**: Can notify music servers of new content
- **Other \*arr apps**: Shares configuration patterns with Sonarr, Radarr, etc.

For more information about LinuxServer.io containers, see: https://docs.linuxserver.io/
