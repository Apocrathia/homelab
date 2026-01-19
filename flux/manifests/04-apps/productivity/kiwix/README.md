# Kiwix

Offline Wikipedia and content library server for serving ZIM (Zstandard-compressed Information Medium) files.

> **Navigation**: [← Back to Management README](../README.md)

## Documentation

- **[Kiwix Documentation](https://wiki.kiwix.org/wiki/Main_Page)** - Primary documentation source
- **[Kiwix Tools GitHub](https://github.com/kiwix/kiwix-tools)** - Source code and issues
- **[Kiwix Tools Documentation](https://deepwiki.com/kiwix/kiwix-tools)** - Architecture and API documentation
- **[ZIM File Downloads](https://download.kiwix.org/)** - Available ZIM file catalog

## Overview

This deployment includes:

- kiwix-serve HTTP server for serving ZIM files
- Library-based multi-ZIM serving with automatic reload
- Automated ZIM file updates via CronJob
- Authentik proxy authentication
- SMB storage integration for ZIM file library

## Configuration

### Storage

- **ZIM Files**: SMB mount to `//storage.services.apocrathia.com/Library/zim`
- **Library XML**: Stored alongside ZIM files on SMB share
- **Access**: Read-only for kiwix-serve, read-write for updater CronJob

### ZIM File Management

ZIM files are managed automatically via a daily CronJob:

- **Schedule**: Daily at 2:00 AM
- **Updater Script**: `kiwix-zim-updater` from GitHub
- **Process**: Downloads latest ZIM files and updates library.xml
- **Options**: HTTP(S) downloads with checksum verification

### Access

- **External URL**: `https://wiki.gateway.services.apocrathia.com`
- **Internal Service**: `http://kiwix.kiwix.svc.cluster.local:80`

## Authentication

Authentication is handled through Authentik proxy provider:

1. **Proxy Provider**: Routes external requests through Authentik outpost
2. **Application**: Configured in Authentik with Home group
3. **Outpost**: Deployed in Authentik namespace for proxy routing

## Troubleshooting

### Common Issues

1. **Library XML Not Found**

   ```bash
   # Check if library.xml exists on SMB share
   kubectl -n kiwix exec -it deployment/kiwix -- ls -la /data/library.xml

   # Check SMB volume mount
   kubectl -n kiwix get pvc kiwix-zim-pvc
   ```

2. **ZIM Files Not Updating**

   ```bash
   # Check CronJob status
   kubectl -n kiwix get cronjob kiwix-zim-updater

   # View last job logs
   kubectl -n kiwix logs -l job-name=kiwix-zim-updater --tail=100
   ```

3. **Service Not Accessible**

   ```bash
   # Check pod status
   kubectl -n kiwix get pods -l app.kubernetes.io/name=kiwix

   # Check service
   kubectl -n kiwix get svc kiwix

   # View application logs
   kubectl -n kiwix logs -l app.kubernetes.io/name=kiwix
   ```

### Health Checks

```bash
# Overall status
kubectl -n kiwix get pods,svc,pvc,cronjob

# Check kiwix-serve logs
kubectl -n kiwix logs -l app.kubernetes.io/name=kiwix

# Check updater CronJob
kubectl -n kiwix get cronjob kiwix-zim-updater
```
