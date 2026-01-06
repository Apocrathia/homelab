# RClone Manager

[← Management Apps](../README.md)

## Overview

RClone Manager is a cross-platform GUI application for managing [rclone](https://rclone.org/) remotes. It provides a web-based interface to configure cloud storage remotes, mount drives, sync/copy/move files, and schedule backup jobs.

- **Project**: [Zarestia-Dev/rclone-manager](https://github.com/Zarestia-Dev/rclone-manager)
- **External URL**: <https://rclone.gateway.services.apocrathia.com>

## Features

- Manage rclone remotes (add/edit/delete/clone) with OAuth support
- Mount and serve remotes
- Sync, copy, move, and bisync operations between locations
- Job scheduling with progress monitoring
- Works with all major cloud providers (Drive, OneDrive, Dropbox, S3, B2, etc.)

## Configuration

Configuration is done entirely through the web UI. The application stores:

- Rclone remote configurations in `/home/rclone-manager/.config/rclone`
- Application settings in `/home/rclone-manager/.local/share/com.rclone.manager.headless`

Both directories are persisted via Longhorn volumes.

## Authentication

Access is protected by Authentik proxy authentication.

## Storage

| Volume     | Mount Path                                                      | Type                |
| ---------- | --------------------------------------------------------------- | ------------------- |
| `config`   | `/home/rclone-manager/.config/rclone`                           | Longhorn            |
| `app-data` | `/home/rclone-manager/.local/share/com.rclone.manager.headless` | Longhorn            |
| `cloud`    | `/data/cloud`                                                   | SMB (Library/Cloud) |

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n rclone

# View logs
kubectl logs -n rclone -l app.kubernetes.io/name=rclone -f

# Check health endpoint (via port-forward, no curl in container)
kubectl port-forward -n rclone svc/rclone 8080:8080
curl localhost:8080/health
```
