# Komga

Self-hosted media server for comics, manga, magazines, and eBooks.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Komga Documentation](https://komga.org/docs/)** - Primary documentation source
- **[GitHub Repository](https://github.com/gotson/komga)** - Source code and issues

## Overview

This deployment includes:

- Supports CBZ, CBR, CB7, RAR, ZIP, 7Z, TAR, PDF, EPUB formats
- Web-based reader with progress tracking
- OPDS v1.2/v2.0 feed for e-reader apps
- Kobo Sync and KOReader Sync for native e-reader support
- Automatic metadata detection from ComicInfo.xml and EPUB metadata
- Collections and read lists for organizing content
- Authentik SSO integration

## Access

- **URL**: `https://komga.gateway.services.apocrathia.com`

## Configuration

Komga uses environment variables for configuration. Key settings in the helmrelease:

- `KOMGA_CONFIGDIR`: Configuration and database directory
- `TZ`: Timezone

Additional configuration can be done through the web UI after first login.

See `helmrelease.yaml` for complete deployment configuration.

### Storage

- **Config**: Longhorn volume for SQLite database and Lucene search index
- **Media**: SMB shares for comic/manga/ebook libraries

## Authentication

Uses Authentik SSO with OPDS/API endpoints bypassing authentication for e-reader compatibility.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n komga

# Application logs
kubectl logs -n komga deployment/komga -f

# Check Authentik outpost
kubectl get pods -n authentik | grep komga
```
