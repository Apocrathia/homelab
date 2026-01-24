# Media Applications

Media server ecosystem for personal media collection management, streaming, and acquisitions.

> **Navigation**: [← Back to Apps README](../README.md)

## Overview

Media applications are organized into three categories:

- **Servers**: Media streaming and playback services
- **Management**: Arr stack automation and media organization
- **Acquisitions**: Download clients and indexers

## Servers

- **[Audiobookshelf](./servers/audiobookshelf/README.md)** - Audiobook and podcast server with mobile app support and progress sync
- **[Invidious](./servers/invidious/README.md)** - Privacy-focused YouTube frontend without ads or tracking
- **[Jellyfin](./servers/jellyfin/README.md)** - Open-source media server with SSO plugin for Authentik
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

### Photo/Video Management

- **[Immich](./management/immich/README.md)** - Photo and video backup with ML face recognition and smart search
- **[icloudpd](./management/icloudpd/README.md)** - Background service syncing iCloud Photos to NAS storage

### Media Tools

- **[Agregarr](./management/agregarr/README.md)** - Plex collection manager using Trakt, IMDb, TMDB, and other list sources
- **[Chaptarr](./management/chaptarr/README.md)** - Chapter management for audiobooks and ebooks
- **[Cleanuparr](./management/cleanuparr/README.md)** - Monitors and removes blocked/stalled downloads from Arr apps
- **[DAPS](./management/daps/README.md)** - Poster management and Arr automation scripts
- **[Huntarr](./management/huntarr/README.md)** - Automated missing content hunter for Arr apps
- **[Maintainerr](./management/maintainerr/README.md)** - Removes stale Plex content based on configurable rules
- **[Mixarr](./management/mixarr/README.md)** - Music discovery for Lidarr with AI-powered recommendations
- **[Ombi](./management/ombi/README.md)** - Media request management for Plex
- **[Overseerr](./management/overseerr/README.md)** - Media request and discovery with Plex OAuth
- **[Recommendarr](./management/recommendarr/README.md)** - AI-powered TV and movie recommendations
- **[Recyclarr](./management/recyclarr/README.md)** - TRaSH Guides sync for quality profiles
- **[Shinkro](./management/shinkro/README.md)** - Syncs Plex watch status to MyAnimeList
- **[Suwayomi](./management/suwayomi/README.md)** - Manga download manager using Tachiyomi extensions
- **[Taggarr](./management/taggarr/README.md)** - Tags anime in Sonarr based on dubbed audio availability
- **[Tautulli](./management/tautulli/README.md)** - Plex monitoring and statistics
- **[Tdarr](./management/tdarr/README.md)** - Distributed transcoding with DaemonSet worker nodes

### Utilities

- **[ArrSync](./management/scripts/arrsync/README.md)** - Refreshes Arr file metadata after Tdarr re-encodes to x265

## Acquisitions

### Indexers

- **[Prowlarr](./acquisitions/prowlarr/README.md)** - Centralized indexer manager with Flaresolverr sidecar for CloudFlare bypass
- **[Bitmagnet](./acquisitions/bitmagnet/README.md)** - DHT crawler and torrent search engine with Torznab API
- **[Zilean](./acquisitions/zilean/README.md)** - Aggregates DebridMediaManager metadata, serves Torznab API to Prowlarr

### Download Clients

- **[qBittorrent](./acquisitions/qbittorrent/README.md)** - BitTorrent client with Gluetun VPN and kill switch
- **[SABnzbd](./acquisitions/sabnzbd/README.md)** - Usenet client with Gluetun VPN and kill switch
- **[rdt-client](./acquisitions/rdt-client/README.md)** - Real-Debrid integration via qBittorrent API emulation for Sonarr/Radarr
- **[Reaparr](./acquisitions/reaparr/README.md)** - Downloads content from remote Plex servers to local library

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

- Prowlarr → All Arr apps for indexer sync
- Sonarr/Radarr → rdt-client for debrid downloads, qBittorrent/SABnzbd for direct downloads
- Zilean → Prowlarr for debrid media indexing
- Tautulli → Plex for monitoring

## References

- **[Plex](https://support.plex.tv/)** - Media server documentation
- **[Servarr Wiki](https://wiki.servarr.com/)** - \*arr application documentation
- **[TRaSH Guides](https://trash-guides.info/)** - Configuration best practices
