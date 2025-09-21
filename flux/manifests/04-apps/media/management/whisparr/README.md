# Whisparr

Whisparr is an adult entertainment collection manager for Usenet and BitTorrent users. It can monitor multiple RSS feeds for new content and will interface with clients and indexers to grab, sort, and rename them. It can also be configured to automatically upgrade the quality of existing files in the library when a better quality format becomes available.

## Configuration

This deployment uses the Hotio Whisparr image with the standard Hotio configuration pattern.

### Key Features

- **Hotio standard**: Uses root-initiated container with PUID/PGID user switching
- **Persistent storage**: Configuration stored on Longhorn volumes
- **Media access**: SMB mounts for downloads and adult content libraries
- **Authentik integration**: SSO authentication through Authentik
- **Gateway access**: Available at `https://whisparr.gateway.services.apocrathia.com`

### Security Configuration

The deployment follows the Hotio standard pattern:

- Starts as root to initialize user/group mappings
- Switches to PUID/PGID (1000:1000) after initialization
- Privilege escalation enabled for container init system
- Required capabilities: SETUID, SETGID, CHOWN, DAC_OVERRIDE
- Writable root filesystem for Hotio container compatibility

### Storage

- **Config volume**: 10GB Longhorn persistent volume for application configuration
- **Downloads volume**: SMB mount for download client integration
- **Adult volume**: SMB mount for adult content library access

### Access

Whisparr is accessible through:

- **Web UI**: `https://whisparr.gateway.services.apocrathia.com`
- **Authentication**: Managed by Authentik SSO

## Technical Notes

### Hotio Configuration

This deployment uses the standard Hotio configuration pattern, which:

1. **Starts as root**: Allows container init to set up user/group mappings and directories
2. **Switches to PUID/PGID**: After initialization, runs as user 1000:1000
3. **Full compatibility**: Supports custom services and all Hotio container features
4. **Automatic permissions**: Handles volume ownership and permissions automatically
