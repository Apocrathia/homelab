# iCloud Photos Downloader

Background service that syncs iCloud Photos to local NAS storage.

> **Navigation**: [← Back to Media Management README](../README.md)

## Documentation

- **[icloudpd Documentation](https://icloudpd.github.io/icloud_photos_downloader/)** - Primary documentation source
- **[GitHub Repository](https://github.com/icloud-photos-downloader/icloud_photos_downloader)** - Source code and issues

## Overview

- **Sync Mode**: Copy (download only, no iCloud deletion)
- **Interval**: Hourly checks for new photos
- **Folder Structure**: `YYYY/MM/DD`
- **Content**: All photos, videos, and live photos

## Authentication

Uses an [app-specific password](https://support.apple.com/en-us/102654) for authentication:

1. Go to [account.apple.com](https://account.apple.com)
2. Sign-In and Security → App-Specific Passwords
3. Generate a password labeled "icloudpd"
4. Store in 1Password at `vaults/Secrets/items/icloudpd-secrets`:
   - `username`: iCloud email address
   - `password`: app-specific password

## Storage

- **Config**: Longhorn PVC for cookie/session persistence
- **Photos**: SMB mount to `//storage.services.apocrathia.com/Pictures/iCloud`

## Troubleshooting

```bash
# Check sync status
kubectl logs -n icloudpd deployment/icloudpd -f

# Force resync (restart pod)
kubectl rollout restart -n icloudpd deployment/icloudpd
```
