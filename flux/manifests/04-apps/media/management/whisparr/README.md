# Whisparr

Adult entertainment collection manager for Usenet and BitTorrent users with automated monitoring and quality upgrades.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Whisparr Wiki](https://wiki.servarr.com/whisparr)** - Primary documentation source
- **[GitHub Repository](https://github.com/Whisparr/Whisparr)** - Source code and issues

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

- **Config volume**: Longhorn persistent volume for application configuration
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

## Troubleshooting

```bash
# Pod status
kubectl get pods -n whisparr

# Application logs
kubectl logs -n whisparr deployment/whisparr -f

# Check Authentik outpost
kubectl get pods -n authentik | grep whisparr
```
