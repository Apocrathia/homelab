# Uptime Kuma

Self-hosted monitoring tool for tracking service uptime and performance across multiple protocols with 90+ notification providers.

> **Navigation**: [← Back to Management Apps](../README.md)

- **GitHub**: [louislam/uptime-kuma](https://github.com/louislam/uptime-kuma)
- **Documentation**: [uptime.kuma.pet](https://uptime.kuma.pet)

## Access

- **URL**: https://uptime.gateway.services.apocrathia.com
- **Authentication**: SSO via Authentik

## Features

- **Multi-Protocol Monitoring**: HTTP/HTTPS, TCP, Ping, DNS, Docker containers, and more
- **Real-time Notifications**: 90+ providers including Discord, Telegram, email, PagerDuty
- **Status Pages**: Public-facing status pages with custom domains
- **Performance Tracking**: Response time charts and uptime statistics
- **Modern Interface**: Web UI with dark/light themes and mobile support

## Configuration

### Container

- **Image**: `ghcr.io/louislam/uptime-kuma:beta-rootless` (security-hardened)
- **Database**: SQLite
- **Port**: 3001

### Storage

- **Type**: Longhorn persistent storage
- **Capacity**: 10Gi
- **Mount Path**: `/app/data`
- **Contents**: SQLite database, uploads, screenshots

### Security

- **Rootless container**: Runs as user 1000:1000
- **No Linux capabilities**: Maximum security hardening
- **Read-only root filesystem**: Disabled only where necessary

## Initial Setup

1. Access Uptime Kuma at https://uptime.gateway.services.apocrathia.com
2. Create admin account through the setup wizard
3. Configure your first monitors and notification channels
