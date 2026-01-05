# Plex Media Server

Media server for streaming content from SMB storage shares with transcoding capabilities.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Plex Documentation](https://support.plex.tv/)** - Primary documentation source
- **[LinuxServer.io Plex](https://docs.linuxserver.io/images/docker-plex)** - Container documentation
- **[Plex Docker Image](https://hub.docker.com/r/linuxserver/plex)** - Container registry

## Overview

This deployment includes:

- Plex Media Server with transcoding capabilities
- Direct LoadBalancer access (no Authentik proxy)
- SMB mounts for media library access
- Longhorn persistent storage for configuration
- Resource optimization for transcoding workloads

## Configuration

### Storage

- **Configuration Volume**: Longhorn volume at `/config`
- **Transcoding Volume**: EmptyDir at `/transcode` for temporary files
- **Media Libraries**: SMB mounts for content access

### Media Libraries

- **TV Shows**: `/tv` → `//storage.services.apocrathia.com/Video/TV Shows`
- **Movies**: `/movies` → `//storage.services.apocrathia.com/Video/Movies`
- **Anime**: `/anime` → `//storage.services.apocrathia.com/Video/Anime`
- **Educational**: `/educational` → `//storage.services.apocrathia.com/Video/Educational`
- **Music**: `/music` → `//storage.services.apocrathia.com/Audio/Music`
- **Music Videos**: `/music-videos` → `//storage.services.apocrathia.com/Video/Music Videos`

### Access

- **External URL**: `https://plex.services.apocrathia.com`
- **Internal Service**: `http://plex.plex.svc.cluster.local:80`

## Authentication

Direct access via LoadBalancer service - no Authentik proxy integration.

## Security Considerations

- **Direct Access**: No proxy authentication layer
- **Resource Limits**: Optimized for transcoding workloads
- **Storage Security**: Configuration stored on Longhorn volumes

## Troubleshooting

### Common Issues

1. **Transcoding Issues**

   ```bash
   # Check pod resource usage
   kubectl -n plex top pod

   # Check transcoding volume
   kubectl -n plex exec -it deployment/plex -- df -h /transcode
   ```

2. **Media Library Access**

   ```bash
   # Check SMB mounts
   kubectl -n plex exec -it deployment/plex -- mount | grep storage

   # Test SMB connectivity
   kubectl -n plex exec -it deployment/plex -- ls -la /tv
   ```

### Health Checks

```bash
# Overall status
kubectl -n plex get pods,svc,pvc

# Plex application status
kubectl -n plex get pods -l app.kubernetes.io/name=plex

# Check LoadBalancer IP
kubectl -n plex get svc plex
```
