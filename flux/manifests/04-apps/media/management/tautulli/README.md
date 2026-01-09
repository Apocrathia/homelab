# Tautulli

Python-based monitoring and tracking tool for Plex Media Server with analytics, notifications, and user statistics.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Tautulli Documentation](https://tautulli.com/)** - Official documentation
- **[GitHub Repository](https://github.com/Tautulli/Tautulli)** - Source code and issues

## Configuration

- **Image**: Official Tautulli container (`ghcr.io/tautulli/tautulli`)
- **Port**: 8181 (standard Tautulli web interface port)
- **Authentication**: Authentik SSO proxy for secure access
- **Storage**: Longhorn persistent volume for configuration, logs, cache, and data
- **Security**: Runs as root initially for setup, then drops to user 1000:1000
- **Resources**: Configured in `helmrelease.yaml`

## Features

- Real-time monitoring of Plex Media Server activity
- User statistics and watching history
- Customizable notifications for stream activity and new media
- Rich analytics with graphing and reporting
- Complete library statistics and media information

## Access

- **External**: `https://tautulli.gateway.services.apocrathia.com`
- **Internal**: `http://tautulli.tautulli.svc.cluster.local:80`
- **Configuration**: Longhorn volume at `/config`

## Troubleshooting

```bash
# Pod status
kubectl get pods -n tautulli

# Application logs
kubectl logs -n tautulli deployment/tautulli -f

# Check Authentik outpost
kubectl get pods -n authentik | grep tautulli
```
