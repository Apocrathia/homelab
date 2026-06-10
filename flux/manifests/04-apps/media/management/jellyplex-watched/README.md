# JellyPlex-Watched

Syncs watched status between Plex and Jellyfin on a schedule.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment runs [JellyPlex-Watched](https://github.com/luigi311/JellyPlex-Watched) as a CronJob. Each run compares watch history on Plex and Jellyfin, then updates the other server when items differ. Matching uses filenames and provider IDs.

- Bidirectional Plex ↔ Jellyfin sync
- Cluster-internal API access to Plex and Jellyfin services
- Persistent log and mark files across runs
- No web UI or external access

## Configuration

Configuration is environment variables in `cronjob.yaml`. The app reads env vars directly (no `.env` file in the container).

### Secrets

Create a 1Password item at `vaults/Secrets/items/jellyplex-watched-secrets`:

| Field            | Purpose                                    |
| ---------------- | ------------------------------------------ |
| `plex-token`     | Plex X-Plex-Token                          |
| `jellyfin-token` | Jellyfin API key from Dashboard → API Keys |

### Sync behavior

- `DRYRUN=False` — syncs watch status for real. Set to `True` in `cronjob.yaml` to preview changes without writing.
- `USER_MAPPING` maps Plex `apocrathia` to Jellyfin `ianyoung`. Add entries if more users need syncing.
- Emby sync flags are disabled; no Emby server is configured.

### Internal services

- Plex: `http://plex.plex.svc.cluster.local:80`
- Jellyfin: `http://jellyfin.jellyfin.svc.cluster.local:80`

## Initial setup

1. Create the 1Password item with Plex and Jellyfin API tokens.
2. Apply manifests and wait for the 1Password operator to sync the secret.
3. Trigger a manual job run and inspect logs (see Troubleshooting).
4. Set `DRYRUN=False` in `cronjob.yaml` when ready to write changes.

## Troubleshooting

```bash
# CronJob and recent jobs
kubectl get cronjob,job -n jellyplex-watched

# Trigger a manual run
kubectl create job -n jellyplex-watched --from=cronjob/jellyplex-watched jellyplex-watched-manual-$(date +%s)

# Logs from the latest job pod (replace JOB_NAME)
kubectl get pods -n jellyplex-watched
kubectl logs -n jellyplex-watched job/JOB_NAME
```

If Jellyfin returns JSON mimetype errors, add the cluster pod CIDR to Jellyfin LAN networks (see [upstream troubleshooting](https://github.com/luigi311/JellyPlex-Watched#troubleshootingissues)).

## References

- [JellyPlex-Watched GitHub](https://github.com/luigi311/JellyPlex-Watched)
- [Configuration reference](https://github.com/luigi311/JellyPlex-Watched/blob/main/.env.sample)
