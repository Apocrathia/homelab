# Mylar

Comic book collection manager and automation tool. Monitors for new issues, handles downloads, and organizes comic libraries.

> **Navigation**: [← Back to Media README](../../README.md)

## Security Notice

This deployment uses the LinuxServer.io container which runs as root for s6-overlay init. A rootless container is [pending on containerforge](https://github.com/trueforge-org/containerforge/tree/main/porting/post-processed/mylar3). Once available, the deployment should be updated to use the rootless image with a proper non-root security context.

## Overview

This deployment includes:

- Mylar3 comic book manager with RSS monitoring
- ComicVine integration for metadata
- Download client support (SABnzbd, Transmission, qBittorrent, etc.)
- Authentik SSO integration
- SMB mounts for downloads and comics library

## Access

- **URL**: `https://mylar.gateway.services.apocrathia.com`

## Configuration

Mylar is configured through its web UI after initial deployment. The application generates a `config.ini` file on first run in the `/config` volume.

See `helmrelease.yaml` for deployment configuration.

### Storage

- **Configuration**: Longhorn persistent volume at `/config`
- **Comics Library**: SMB mount at `/comics`
- **Downloads**: SMB mount at `/downloads`

## Authentication

Uses Authentik proxy provider for SSO. Mylar only supports local authentication (forms or basic auth), so external SSO is handled at the network layer.

## Initial Setup

1. Access the web UI through Authentik
2. Configure ComicVine API key for metadata
3. Set up comic library root folder (`/comics`)
4. Configure download client connection
5. Add series to monitor

## Troubleshooting

```bash
# Pod status
kubectl get pods -n mylar

# Application logs
kubectl logs -n mylar deployment/mylar -f

# Check Authentik outpost
kubectl get pods -n authentik | grep mylar

# Verify SMB mounts
kubectl exec -n mylar deployment/mylar -- mount | grep storage
```

## References

- **[Mylar3 Wiki](https://github.com/mylar3/mylar3/wiki)** - Primary documentation
- **[Mylar3 GitHub](https://github.com/mylar3/mylar3)** - Source code and issues
- **[LinuxServer.io Mylar3](https://docs.linuxserver.io/images/docker-mylar3)** - Container documentation
