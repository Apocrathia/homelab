# Aurral

[← Back to Management](../README.md)

Self-hosted music discovery companion for a Lidarr-based music stack. Provides personalized recommendations, manages dynamic playlists ("Flows"), and automates track downloads from multiple sources (slskd, Usenet via Prowlarr, yt-dlp).

## Configuration

- **Web UI**: Full configuration via web interface after first deploy
- **Authentication**: OIDC via Authentik
- **Database**: SQLite (aurral.db in /config) - no external database required
- **Data**: Config stored in /config (Longhorn PVC), music library mounted from SMB share at /data

## Access

- **External**: https://aurral.gateway.services.apocrathia.com
- **Internal**: http://aurral.aurral.svc.cluster.local:80

## Integration

- **Lidarr**: Connects to Lidarr for music automation
- **slskd**: Downloads via Soulseek
- **Prowlarr**: Usenet indexer management
- **yt-dlp**: YouTube audio downloads

## Troubleshooting

```bash
kubectl get pods -n aurral
kubectl logs -n aurral -l app.kubernetes.io/name=aurral
kubectl exec -it -n aurral <pod> -- /bin/sh
```
