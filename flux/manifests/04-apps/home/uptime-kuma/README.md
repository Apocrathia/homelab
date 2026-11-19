# Uptime Kuma

Uptime and latency monitoring across multiple protocols.

> **Navigation**: [← Back to Home README](../README.md)

## Overview

This deployment includes:

- Multi-protocol monitoring (HTTP/HTTPS, TCP, Ping, DNS, Docker)
- Real-time notifications with 90+ providers
- Public-facing status pages with custom domains
- Performance tracking with response time charts
- Web interface with dark/light themes
- Authentik SSO integration

## Configuration

### Storage

- **Data Volume**: Longhorn persistent volume for SQLite database and uploads (`/app/data`)

### Access

- **External URL**: `https://uptime.gateway.services.apocrathia.com`
- **Internal Service**: `http://uptime-kuma.uptime-kuma.svc.cluster.local:3001`

## Authentication

Authentik SSO via a proxy provider from the Authentik blueprint; the
HTTPRoute and outpost are created automatically.

## Security Considerations

- **Rootless Container**: Runs as user 1000:1000
- **No Linux Capabilities**: All capabilities dropped
- **Read-only Root Filesystem**: Disabled only where necessary
- **SSO Integration**: Authentication through the Authentik proxy

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

## References

- **[Uptime Kuma Documentation](https://uptime.kuma.pet)** - Primary documentation source
- **[Uptime Kuma GitHub](https://github.com/louislam/uptime-kuma)** - Source code and issues
