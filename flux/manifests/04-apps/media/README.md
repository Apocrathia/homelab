# Media Applications

Media server ecosystem for personal media collection management, streaming, and acquisition.

> **Navigation**: [← Back to Apps README](../README.md)

## Overview

Media applications are organized into three categories:

- **Servers**: Media streaming and playback services
- **Management**: Arr stack automation and media organization
- **Acquisitions**: Download clients and indexers

## Servers

### [Plex](./servers/plex/README.md)

Media server for streaming content with transcoding capabilities and LoadBalancer access.

### [Cardinal](./servers/cardinal/README.md)

Music streaming server for personal audio library management.

### [Tunarr](./servers/tunarr/README.md)

Custom TV channel creation from media library content.

## Management

### Arr Stack

- **[Sonarr](./management/sonarr/README.md)** - TV show management and automation
- **[Radarr](./management/radarr/README.md)** - Movie management and automation
- **[Lidarr](./management/lidarr/README.md)** - Music management and automation
- **[Whisparr](./management/whisparr/README.md)** - Adult content management
- **[Prowlarr](./management/prowlarr/README.md)** - Indexer management for all Arr applications
- **[Bazarr](./management/bazarr/README.md)** - Subtitle management and automation

### Media Tools

- **[Tdarr](./management/tdarr/README.md)** - Distributed transcoding with worker nodes
- **[Recyclarr](./management/recyclarr/README.md)** - TRaSH Guides sync for quality profiles
- **[Tautulli](./management/tautulli/README.md)** - Plex monitoring and statistics
- **[Ombi](./management/ombi/README.md)** - Media request management
- **[Shinkro](./management/shinkro/README.md)** - AniList integration and tracking
- **[Taggarr](./management/taggarr/README.md)** - Media tagging automation
- **[Huntarr](./management/huntarr/README.md)** - Search automation for missing media
- **[Cleanuparr](./management/cleanuparr/README.md)** - Orphaned media cleanup

### Utilities

- **[ArrSync](./management/scripts/arrsync/README.md)** - Cross-Arr synchronization scripts

## Acquisitions

### Download Clients

- **[qBittorrent](./acquisitions/qbittorrent/README.md)** - BitTorrent client with VPN integration
- **[SABnzbd](./acquisitions/sabnzbd/README.md)** - Usenet download client
- **[rdt-client](./acquisitions/rdt-client/README.md)** - Real-Debrid download client

### Indexers

- **[Bitmagnet](./acquisitions/bitmagnet/README.md)** - DHT indexer and torrent search engine

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

### Internal Communication

Arr applications communicate via internal Kubernetes services:

- Sonarr/Radarr → qBittorrent/SABnzbd for downloads
- Prowlarr → All Arr apps for indexer sync
- Tautulli → Plex for monitoring
