# Uptime Kuma

Self-hosted monitoring tool for tracking service uptime and performance across multiple protocols.

> **Navigation**: [← Back to Management README](../README.md)

## Documentation

- **[Uptime Kuma Documentation](https://uptime.kuma.pet)** - Primary documentation source
- **[Uptime Kuma GitHub](https://github.com/louislam/uptime-kuma)** - Source code and issues

## Overview

This deployment includes:

- Multi-protocol monitoring (HTTP/HTTPS, TCP, Ping, DNS, Docker)
- Real-time notifications with 90+ providers
- Public-facing status pages with custom domains
- Performance tracking with response time charts
- Modern web interface with dark/light themes
- Authentik SSO integration for secure access

## Configuration

### Storage

- **Data Volume**: 10GB Longhorn persistent volume for SQLite database and uploads (`/app/data`)

### Access

- **External URL**: `https://uptime.gateway.services.apocrathia.com`
- **Internal Service**: `http://uptime-kuma.uptime-kuma.svc.cluster.local:3001`

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Automatic Setup**: HTTPRoute and outpost created automatically
3. **Clean Deployment**: Works with Authentik from day one

## Security Considerations

- **Rootless Container**: Runs as user 1000:1000 for security hardening
- **No Linux Capabilities**: Maximum security hardening
- **Read-only Root Filesystem**: Disabled only where necessary
- **SSO Integration**: Complete authentication through Authentik proxy

## Troubleshooting

### Common Issues

1. **Database Issues**

   ```bash
   # Check database file
   kubectl -n uptime-kuma exec -it deployment/uptime-kuma -- ls -la /app/data

   # Check database permissions
   kubectl -n uptime-kuma exec -it deployment/uptime-kuma -- ls -la /app/data/kuma.db
   ```

2. **Monitoring Issues**

   ```bash
   # Check Uptime Kuma logs
   kubectl -n uptime-kuma logs deployment/uptime-kuma --tail=50

   # Check monitoring targets
   kubectl -n uptime-kuma exec -it deployment/uptime-kuma -- curl -s http://localhost:3001/api/status-page
   ```

### Health Checks

```bash
# Overall status
kubectl -n uptime-kuma get pods,svc,pvc

# Uptime Kuma application status
kubectl -n uptime-kuma get pods -l app.kubernetes.io/name=uptime-kuma

# Check Authentik outpost
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost
```
