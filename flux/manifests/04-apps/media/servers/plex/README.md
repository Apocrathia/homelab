# Plex Media Server

Plex Media Server deployment for streaming media content from SMB storage shares.

## Documentation

- **Plex Documentation**: https://support.plex.tv/
- **LinuxServer.io Plex**: https://docs.linuxserver.io/images/docker-plex
- **Docker Image**: `ghcr.io/linuxserver/plex:latest`

## Configuration

- **Image**: LinuxServer.io Plex container with automatic updates
- **Port**: 32400 (standard Plex port)
- **Authentication**: Direct access via LoadBalancer (no Authentik proxy)
- **Storage**: Longhorn for configuration, SMB mounts for media libraries
- **Resources**: 2-4GB RAM, 0.5-2 CPU cores for transcoding workloads

## Media Libraries

- **TV Shows**: `/tv` → `//storage.services.apocrathia.com/Video/TV Shows`
- **Movies**: `/movies` → `//storage.services.apocrathia.com/Video/Movies`
- **Anime**: `/anime` → `//storage.services.apocrathia.com/Video/Anime`
- **Educational**: `/educational` → `//storage.services.apocrathia.com/Video/Educational`
- **Music**: `/music` → `//storage.services.apocrathia.com/Audio/Music`
- **Music Videos**: `/music-videos` → `//storage.services.apocrathia.com/Video/Music Videos`

## Access

- **External**: `https://plex.services.apocrathia.com`
- **Internal**: `http://plex.plex.svc.cluster.local:80`
- **Configuration**: Longhorn volume at `/config`
- **Transcoding**: EmptyDir at `/transcode` for temporary files
