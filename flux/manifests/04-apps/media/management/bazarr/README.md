# Bazarr

Bazarr is a companion application to Sonarr and Radarr that manages and downloads subtitles based on your requirements. You define your preferences by TV show or movie and Bazarr takes care of everything for you.

## Configuration

This deployment uses the LinuxServer.io Bazarr image with the standard LinuxServer.io configuration pattern.

### Key Features

- **LinuxServer.io standard**: Uses root-initiated container with PUID/PGID user switching
- **Persistent storage**: Configuration stored on Longhorn volumes
- **Media access**: SMB mounts for anime, TV shows, and movie libraries (read-only)
- **Authentik integration**: SSO authentication through Authentik
- **Gateway access**: Available at `https://bazarr.gateway.services.apocrathia.com`

### Security Configuration

The deployment follows the LinuxServer.io standard pattern:

- Starts as root to initialize user/group mappings
- Switches to PUID/PGID (1000:1000) after initialization
- Privilege escalation enabled for s6-overlay init system
- Required capabilities: SETUID, SETGID, CHOWN, DAC_OVERRIDE
- Writable root filesystem for LinuxServer.io container compatibility

### Storage

- **Config volume**: 5GB Longhorn persistent volume for application configuration
- **Anime volume**: SMB mount for anime library access (read-only)
- **TV volume**: SMB mount for TV shows library access (read-only)
- **Movies volume**: SMB mount for movies library access (read-only)

### Access

Bazarr is accessible through:

- **Web UI**: `https://bazarr.gateway.services.apocrathia.com`
- **Authentication**: Managed by Authentik SSO

## Technical Notes

### LinuxServer.io Standard Configuration

This deployment uses the standard LinuxServer.io configuration pattern, which:

1. **Starts as root**: Allows s6-overlay to initialize user/group mappings and directories
2. **Switches to PUID/PGID**: After initialization, runs as user 1000:1000
3. **Full compatibility**: Supports Docker Mods, custom services, and all LinuxServer.io features
4. **Automatic permissions**: Handles volume ownership and permissions automatically

### Integration

Bazarr integrates with other media management applications:

- **Sonarr/Radarr**: Monitors for new content and downloads subtitles
- **Media libraries**: Direct read-only access to anime, TV, and movie libraries
- **Subtitle providers**: Integrates with multiple subtitle providers
- **Other \*arr apps**: Complements the \*arr application ecosystem

For more information about LinuxServer.io containers, see: https://docs.linuxserver.io/
