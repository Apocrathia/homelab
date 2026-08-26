# Media Applications

Media server ecosystem for personal media collection management, streaming, and acquisitions.

> **Navigation**: [← Back to Apps README](../README.md)

## Overview

Media applications are organized into three categories:

- **Servers**: Media streaming and playback services
- **Management**: Arr stack automation and media organization
- **Acquisitions**: Download clients and indexers

## Servers

- **[Jellyfin](./servers/jellyfin/README.md)** - Open-source media server with SSO plugin for Authentik
- **[Jellyfin AI Upscaler](./servers/jellyfin-ai-upscaler/README.md)** - CPU ONNX inference sidecar for the Jellyfin AI Upscaler plugin
- **[Komga](./servers/komga/README.md)** - Media server for comics, manga, magazines, and eBooks with OPDS support
- **[Plex](./servers/plex/README.md)** - Media server with transcoding and direct LoadBalancer access
- **[Tunarr](./servers/tunarr/README.md)** - Virtual TV channel creator with HDHomeRun emulation for Plex/Jellyfin

## Management

### Arr Stack

- **[Sonarr](./management/sonarr/README.md)** - TV show management and automation
- **[Radarr](./management/radarr/README.md)** - Movie management and automation
- **[Lidarr](./management/lidarr/README.md)** - Music management and automation
- **[Whisparr](./management/whisparr/README.md)** - Adult content management
- **[Bazarr](./management/bazarr/README.md)** - Subtitle management with Whisper AI transcription
- **[Chaptarr](./management/chaptarr/README.md)** - Audiobook and eBook collection manager with Authentik OIDC

### Photo/Video Management

- **[Immich](./management/immich/README.md)** - Photo and video backup with ML face recognition and smart search
- **[icloudpd](./management/icloudpd/README.md)** - Background service syncing iCloud Photos to NAS storage
- **[JellyPlex-Watched](./management/jellyplex-watched/README.md)** - Syncs watched status between Plex and Jellyfin

### Media Tools

- **[Aurral](./management/aurral/README.md)** - Music discovery companion for Lidarr (Seerr-like, for music)
- **[Cleanuparr](./management/cleanuparr/README.md)** - Monitors and removes blocked/stalled downloads from Arr apps
- **[Houndarr](./management/houndarr/README.md)** - Rate-limited missing, cutoff, and upgrade searches for the \*arr stack
- **[Huntarr2](./management/huntarr2/README.md)** - Automated missing content and quality upgrade searches
- **[Recyclarr](./management/recyclarr/README.md)** - TRaSH Guides sync for quality profiles
- **[Seerr](./management/seerr/README.md)** - Media request and discovery for Plex, Jellyfin, and Emby
- **[Suwayomi](./management/suwayomi/README.md)** - Manga download manager using Tachiyomi extensions
- **[Tracearr](./management/tracearr/README.md)** - Multi-server Plex, Jellyfin, and Emby monitoring with sharing detection
- **[Tdarr](./management/tdarr/README.md)** - Distributed transcoding with DaemonSet worker nodes

### Utilities

- **[ArrSync](./management/scripts/arrsync/README.md)** - Refreshes Arr file metadata after Tdarr re-encodes to x265

## Acquisitions

### Indexers

- **[Prowlarr](./acquisitions/prowlarr/README.md)** - Centralized indexer manager with Flaresolverr sidecar for CloudFlare bypass

### Download Clients

- **[qBittorrent](./acquisitions/qbittorrent/README.md)** - BitTorrent client with Gluetun VPN and kill switch
- **[Lidarr YouTube Downloader](./acquisitions/lidarr-youtube-downloader/README.md)** - Fetches missing Lidarr albums from YouTube as tagged MP3s
- **[SABnzbd](./acquisitions/sabnzbd/README.md)** - Usenet client with Gluetun VPN and kill switch
- **[slskd](./acquisitions/slskd/README.md)** - Soulseek daemon with web UI for P2P music acquisition
- **[Soularr](./acquisitions/soularr/README.md)** - Lidarr ↔ Slskd bridge for automated Soulseek grabs

### Community

- **[Archive Team Warrior](./acquisitions/archiveteam-warrior/README.md)** - Distributed web archiving volunteer service

## Storage Integration

- **Media Libraries**: SMB mounts to network storage for video and audio content
- **Configuration**: Longhorn persistent volumes for application data
- **Shared Access**: ReadWriteMany volumes for cross-application access

## Architecture

All media applications integrate with:

- **Authentik SSO**: Authentication through proxy or OIDC providers
- **Gateway API**: External access via Cilium Gateway
- **Prometheus**: Metrics collection and monitoring
- **Loki**: Centralized logging

## Common Patterns

### SMB Mount Paths

- `/tv` → `//storage.services.apocrathia.com/Video/TV Shows`
- `/movies` → `//storage.services.apocrathia.com/Video/Movies`
- `/anime` → `//storage.services.apocrathia.com/Video/Anime`
- `/music` → `//storage.services.apocrathia.com/Audio/Music`
- `/audiobooks` → `//storage.services.apocrathia.com/Audio/Audiobooks`

### Internal Communication

Arr applications communicate via internal Kubernetes services:

- Prowlarr → Arr apps for indexer sync
- Sonarr/Radarr → qBittorrent and SABnzbd for downloads

## References

- **[Plex](https://support.plex.tv/)** - Media server documentation
- **[Servarr Wiki](https://wiki.servarr.com/)** - \*arr application documentation
- **[TRaSH Guides](https://trash-guides.info/)** - Configuration best practices
