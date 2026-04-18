# RClone Manager

Cross-platform GUI application for managing rclone remotes with a web-based interface.

> **Navigation**: [← Back to Management Apps README](../README.md)

## Overview

RClone Manager provides a web-based interface to configure cloud storage remotes, mount drives, sync/copy/move files, and schedule backup jobs.

- **External URL**: `https://rclone.gateway.services.apocrathia.com`

## Features

- Manage rclone remotes (add/edit/delete/clone) with OAuth support
- Mount and serve remotes
- Sync, copy, move, and bisync operations between locations
- Job scheduling with progress monitoring
- Works with all major cloud providers (Drive, OneDrive, Dropbox, S3, B2, etc.)

## Configuration

Configuration is done entirely through the web UI. The container stores `rclone.conf` under `/config` and application data (downloads, cache, logs) under `/data`, matching the [upstream image](https://github.com/Zarestia-Dev/rclone-manager/blob/master/Dockerfile). Both paths use Longhorn volumes in this deployment.

## Authentication

Access is protected by Authentik proxy authentication.

## Storage

| Volume     | Mount Path    | Type                |
| ---------- | ------------- | ------------------- |
| `config`   | `/config`     | Longhorn            |
| `app-data` | `/data`       | Longhorn            |
| `cloud`    | `/data/cloud` | SMB (Library/Cloud) |

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

## References

- **[RClone Documentation](https://rclone.org/docs/)** - RClone official documentation
- **[GitHub Repository](https://github.com/Zarestia-Dev/rclone-manager)** - Source code and issues
