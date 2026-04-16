# Pinchflat

YouTube download manager that automates channel and playlist sync with `yt-dlp`.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Pinchflat web UI for rule-based YouTube downloads
- Persistent app state under `/config` and media output under `/downloads`
- Authentik proxy integration for SSO at the edge

## Access

- **URL**: `https://pinchflat.gateway.services.apocrathia.com`

## Configuration

Pinchflat is configured through its web UI after initial startup.

- **Environment Variables**: Minimal bootstrap config only (timezone)
- **Storage Pattern**: App state persists in `/config`; download targets write to `/downloads`
- **Reverse Proxy**: Application uses websockets for live updates, so proxy websocket support is required

See `helmrelease.yaml` for complete deployment configuration.

## Authentication

Uses an Authentik proxy provider for SSO.

Optional in-app basic auth exists, but SSO is handled upstream by Authentik.

## Initial Setup

1. Open the Pinchflat web UI
2. Create source rules for channels/playlists
3. Configure output naming and folder organization under `/downloads`

## Security Considerations

- Runs as non-root user/group `1000:1000`
- `SECRET_KEY_BASE` can be set if you want a custom cookie signing key
- If `/config` ever moves to a network share, set `JOURNAL_MODE=delete` and back up first

## Troubleshooting

```bash
# Pod and service status
kubectl get pods,svc,pvc -n pinchflat

# Application logs
kubectl logs -n pinchflat deployment/pinchflat -f

# Probe endpoint from inside cluster
kubectl get --raw /api/v1/namespaces/pinchflat/services/http:pinchflat:80/proxy/healthcheck
```

## References

- **[Pinchflat Documentation](https://github.com/kieraneglin/pinchflat/wiki)** - Setup and operations
- **[Pinchflat GitHub Repository](https://github.com/kieraneglin/pinchflat)** - Source code and issues
