# Media Applications

Media server ecosystem for personal media collection management and streaming.

> **Navigation**: [← Back to Apps README](../README.md)

## Overview

Media applications organized into three categories:

- **Servers**: Media streaming (Plex ✅, Jellyfin, Emby)
- **Management**: Arr stack automation (Sonarr, Radarr, Lidarr, etc.)
- **Acquisitions**: Download management (Prowlarr, qBittorrent, SABnzbd)

## Current Deployments

### Plex Media Server

- **Access**: LoadBalancer + NodePort fallback
- **Storage**: SMB mounts for media, Longhorn for config
- **Authentication**: Direct access (no Authentik proxy)

## Storage Integration

- **Media Libraries**: SMB mounts to `/mnt/Storage/Video/` and `/mnt/Storage/Audio/`
- **Configuration**: Longhorn persistent volumes
- **Network**: LoadBalancer external access, ClusterIP internal communication
