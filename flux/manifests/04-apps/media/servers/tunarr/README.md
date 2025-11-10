# Tunarr

LiveTV channel creator that transforms media from Plex, Jellyfin, or Emby servers into continuous virtual TV channels.

> **Navigation**: [← Back to Media README](../README.md)

## Documentation

- **[Tunarr Documentation](https://deepwiki.com/chrisbenincasa/tunarr)** - Architecture and API documentation
- **[Tunarr GitHub](https://github.com/chrisbenincasa/tunarr)** - Source code and issues
- **[Tunarr Container](https://github.com/chrisbenincasa/tunarr/pkgs/container/tunarr)** - Container registry

## Overview

This deployment includes:

- Tunarr web UI for channel configuration
- HDHomeRun emulation for Plex/Jellyfin/Emby integration
- M3U playlist generation for IPTV players
- HLS and MPEGTS streaming support
- XMLTV EPG generation
- Authentik proxy authentication

## Configuration

### Storage

- **Configuration Volume**: Longhorn volume at `/config` (10Gi)
- **Database**: SQLite database stored at `/config/tunarr/db.db`

### Environment Variables

- `TUNARR_SERVER_PORT`: Server port (default: 8000)
- `TUNARR_DATABASE_PATH`: Database storage path (default: `/config/tunarr`)
- `TUNARR_SERVER_TRUST_PROXY`: Enable reverse proxy support (required for Authentik)
- `TUNARR_BIND_ADDR`: Network interface binding (default: `0.0.0.0`)
- `TZ`: Timezone for scheduling (default: `America/Denver`)

### Access

- **External URL**: `https://tunarr.gateway.services.apocrathia.com`
- **Internal Service**: `http://tunarr.tunarr.svc.cluster.local:80`

## Authentication

Authentication is handled through Authentik proxy provider:

1. **Proxy Provider**: Routes external requests through Authentik outpost
2. **Application**: Configured in Authentik with Media category
3. **Outpost**: Deployed in Authentik namespace for proxy routing

## Integration

### Media Sources

Tunarr connects to external media sources:

- **Plex**: Configure Plex server connection in web UI
- **Jellyfin**: Configure Jellyfin server connection in web UI
- **Emby**: Configure Emby server connection in web UI

### Client Access

Tunarr exposes multiple protocols for client compatibility:

- **HDHomeRun Emulation**: SSDP-discoverable tuner for media server integration
- **M3U Playlist**: IPTV player compatibility (`/api/channels.m3u`)
- **HLS Streaming**: Segmented HTTP Live Streaming (`/stream/channels/:id.m3u8`)
- **MPEGTS Streaming**: Continuous MPEG Transport Stream (`/stream/channels/:id`)
- **XMLTV EPG**: Electronic Program Guide (`/api/xmltv.xml`)

## Troubleshooting

### Common Issues

1. **Database Connection**

   ```bash
   # Check database file
   kubectl -n tunarr exec -it deployment/tunarr -- ls -la /config/tunarr

   # Check database permissions
   kubectl -n tunarr exec -it deployment/tunarr -- stat /config/tunarr/db.db
   ```

2. **Streaming Issues**

   ```bash
   # Check pod logs
   kubectl -n tunarr logs -l app=tunarr --tail=100

   # Check service connectivity
   kubectl -n tunarr get svc tunarr
   ```

### Health Checks

```bash
# Overall status
kubectl -n tunarr get pods,svc,pvc

# Application logs
kubectl -n tunarr logs -l app=tunarr --tail=50

# Check configuration volume
kubectl -n tunarr get pvc
```
