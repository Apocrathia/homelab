# Tautulli

Tautulli is a Python-based monitoring and tracking tool for Plex Media Server with analytics, notifications, and user statistics.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **Tautulli Documentation**: https://tautulli.com/
- **GitHub Repository**: https://github.com/Tautulli/Tautulli
- **Docker Image**: `ghcr.io/tautulli/tautulli`

## Configuration

- **Image**: Official Tautulli container (`ghcr.io/tautulli/tautulli`)
- **Port**: 8181 (standard Tautulli web interface port)
- **Authentication**: Authentik SSO proxy for secure access
- **Storage**: Longhorn persistent volume for configuration, logs, cache, and data
- **Security**: Runs as root initially for setup, then drops to user 1000:1000
- **Resources**: 256Mi-1Gi RAM, 100m-500m CPU for Python web application

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
