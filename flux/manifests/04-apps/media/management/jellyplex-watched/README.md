# JellyPlex-Watched

Syncs watched status between Plex and Jellyfin on a loop.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment runs [JellyPlex-Watched](https://github.com/luigi311/JellyPlex-Watched) as a single-replica Deployment via generic-app. The container syncs watch history between Plex and Jellyfin, then sleeps before the next run. Matching uses filenames and provider IDs.

- Bidirectional Plex ↔ Jellyfin sync
- Cluster-internal API access to Plex and Jellyfin services
- Persistent log and mark files across restarts
- No web UI or external access

## Configuration

Runtime settings live in `helmrelease.yaml`. The app reads environment variables directly (no `.env` file in the container).

### Secrets

Create a 1Password item at `vaults/Secrets/items/jellyplex-watched-secrets`:

| Field            | Purpose                                    |
| ---------------- | ------------------------------------------ |
| `plex-token`     | Plex X-Plex-Token                          |
| `jellyfin-token` | Jellyfin API key from Dashboard → API Keys |

### Sync behavior

- `DRYRUN=False` — syncs watch status for real. Set to `True` in `helmrelease.yaml` to preview changes without writing.
- `USER_MAPPING` maps Plex `apocrathia` to Jellyfin `ianyoung`. Add entries if more users need syncing.
- Emby sync flags are disabled; no Emby server is configured.

### Internal services

- Plex: `http://plex.plex.svc.cluster.local:80`
- Jellyfin: `http://jellyfin.jellyfin.svc.cluster.local:80`

## Initial setup

1. Create the 1Password item with Plex and Jellyfin API tokens.
2. Apply manifests and wait for the 1Password operator to sync the secret.
3. Check pod logs after the first sync cycle.
4. Set `DRYRUN=False` in `helmrelease.yaml` when ready to write changes.

## Troubleshooting

```bash
# Deployment and pod status
kubectl get deploy,pods -n jellyplex-watched

# Logs
kubectl logs -n jellyplex-watched deploy/jellyplex-watched -f
```

If Jellyfin returns JSON mimetype errors, add the cluster pod CIDR to Jellyfin LAN networks (see [upstream troubleshooting](https://github.com/luigi311/JellyPlex-Watched#troubleshootingissues)).

## References

- [JellyPlex-Watched GitHub](https://github.com/luigi311/JellyPlex-Watched)
- [Configuration reference](https://github.com/luigi311/JellyPlex-Watched/blob/main/.env.sample)
