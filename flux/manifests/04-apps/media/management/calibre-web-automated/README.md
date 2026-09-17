# Calibre-Web Automated

Automated Calibre ebook library: ingests books, pulls metadata, converts formats, and files everything into a clean author/title structure that Kavita serves.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Ingest pipeline wired to the existing Books/Import folder — files placed there are processed and removed
- Auto-created Calibre library at the Books share root (metadata.db, organized folders)
- Format conversion via bundled Calibre (MOBI to EPUB, etc.)
- NETWORK_SHARE_MODE for the SMB library (SQLite WAL off, polling watcher)
- Kavita reads the organized library read-only

## Access

- **URL**: `https://calibre.gateway.services.apocrathia.com`

## Configuration

All configuration happens in the web UI after deployment. CWA rewrites its own config on every boot, so nothing is pre-seeded.

See `helmrelease.yaml` for complete deployment configuration.

## Authentication

Dashboard-only Authentik bookmark (no SSO provider); CWA uses its own account system. The chart-rendered blueprint binds the tile to the admins group only.

## Initial Setup

1. Open the URL and log in with the default credentials, then **change the admin password immediately** (the CWA README documents the defaults).
2. Ingest settings: tune which formats convert (PDF/EPUB/MOBI handling) and the target format in CWA Settings.
3. Drop books into the Books/Import folder (or let the existing pile process) — CWA files them into the library automatically.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n calibre-web-automated

# Application logs
kubectl logs -n calibre-web-automated deployment/calibre-web-automated -f

# Ingest status
kubectl exec -n calibre-web-automated deployment/calibre-web-automated -- cat /config/cwa_ingest_status
```

If the web UI 500s on a fresh install, a non-root first boot corrupted the config volume — wipe the config PVC and redeploy (upstream issue #1223).

## References

- **[CWA Documentation](https://github.com/crocodilestick/calibre-web-automated)** - Primary documentation source
