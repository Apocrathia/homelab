# Suwayomi

Manga download manager that uses Tachiyomi's extension ecosystem to browse and download from numerous manga sources.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Official Documentation](https://github.com/Suwayomi/Suwayomi-Server/wiki)** - Wiki and setup guides
- **[GitHub Repository](https://github.com/Suwayomi/Suwayomi-Server)** - Source code and issues

## Overview

This deployment includes:

- Suwayomi-Server with bundled WebUI
- Tachiyomi extension support for manga sources
- CBZ download format for Komga compatibility
- SMB mount to shared manga library
- Authentik SSO via proxy provider

## Access

- **URL**: `https://suwayomi.gateway.services.apocrathia.com`

## Configuration

- **Web UI**: All configuration done through web interface after deployment
- Extensions are installed through the WebUI's extension browser

See `helmrelease.yaml` for complete deployment configuration.

## Authentication

Uses Authentik proxy provider for SSO.

## Initial Setup

1. Access the web UI
2. Navigate to Extensions and install desired manga source extensions
3. Configure download settings (already set to CBZ format)
4. Set download location to `/manga` for Komga integration
5. Browse sources and add manga to library

## Storage

- **Data**: Longhorn volume at `/home/suwayomi/.local/share/Tachidesk`
- **Manga**: SMB mount at `/manga` (shared with Komga)

## Troubleshooting

```bash
# Pod status
kubectl get pods -n suwayomi

# Application logs
kubectl logs -n suwayomi deployment/suwayomi -f

# Check Authentik outpost
kubectl get pods -n authentik | grep suwayomi
```
