# Tdarr

Distributed transcoding system for audio and video libraries with rules-based media standardization.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Tdarr Documentation](https://docs.tdarr.io/)** - Official documentation
- **[GitHub Repository](https://github.com/HaveAGitGat/Tdarr)** - Source code and issues

## Configuration

This deployment uses a distributed architecture with separate server and node components for distributed transcoding across the cluster.

### Key Features

- **Distributed processing**: Server orchestrates tasks, nodes execute transcoding
- **Persistent storage**: Configuration and cache stored on Longhorn volumes
- **Media access**: SMB mounts for TV shows, movies, anime, and music libraries
- **Shared workspace**: SMB scratch directory for transcoding operations
- **Authentik integration**: SSO authentication through Authentik
- **Gateway access**: Available at `https://tdarr.gateway.services.apocrathia.com`

### Security Configuration

The deployment follows the standard container pattern:

- Starts as root to initialize user/group mappings
- Switches to PUID/PGID (1000:1000) after initialization
- Privilege escalation enabled for container init system
- Required capabilities: SETUID, SETGID, CHOWN, DAC_OVERRIDE
- Writable root filesystem for container compatibility

### Storage

- **Config volume**: Longhorn persistent volume for server configuration
- **Logs volume**: Longhorn persistent volume for server logs
- **Cache volume**: Longhorn persistent volume for server cache
- **Media volumes**: SMB mounts for TV shows, movies, anime, and music libraries
- **Scratch volume**: SMB mount for transcoding workspace

### Access

Tdarr is accessible through:

- **Web UI**: `https://tdarr.gateway.services.apocrathia.com`
- **Authentication**: Managed by Authentik SSO

## Technical Notes

### Distributed Processing

Tdarr consists of two main components:

1. **Tdarr Server**: Central orchestration component that manages libraries and coordinates transcoding tasks
2. **Tdarr Nodes**: Distributed processing units that execute transcoding tasks assigned by the server

The nodes automatically connect to the server using internal Kubernetes service DNS at `tdarr-server.tdarr.svc.cluster.local:8266`.

### Container Features

- **Distributed architecture**: Server manages tasks, nodes execute transcoding
- **Automatic scaling**: Nodes run on all cluster nodes via DaemonSet
- **Shared media access**: All components access identical media libraries
- **Plugin system**: Comprehensive plugin support for transcoding rules

### Integration

Tdarr integrates with other media management applications:

- **Media libraries**: Direct access to TV shows, movies, anime, and music
- **Plex/Jellyfin**: Can process media for improved compatibility
- **Download clients**: Can monitor and process new downloads
- **Storage systems**: Optimizes media for efficient storage

## Troubleshooting

```bash
# Pod status
kubectl get pods -n tdarr

# Server logs
kubectl logs -n tdarr deployment/tdarr-server -f

# Node logs
kubectl logs -n tdarr daemonset/tdarr-node -f

# Check Authentik outpost
kubectl get pods -n authentik | grep tdarr
```
