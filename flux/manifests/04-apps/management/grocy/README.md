# Grocy

Web-based groceries and household management solution for inventory tracking, meal planning, and chore management.

> **Navigation**: [← Back to Management README](../README.md)

## Documentation

- **[Grocy Documentation](https://grocy.info/)** - Primary documentation source
- **[Grocy GitHub](https://github.com/grocy/grocy)** - Source code and issues
- **[LinuxServer.io Grocy](https://docs.linuxserver.io/images/docker-grocy)** - Container documentation

## Overview

This deployment includes:

- Grocery and household inventory management
- Meal planning and shopping list generation
- Chore and task tracking
- Barcode scanning support
- REST API for external integrations
- Authentik SSO integration for secure access

## Configuration

### Storage

- **Configuration Volume**: 5GB Longhorn persistent volume for application data (`/config`)
- **Database**: SQLite database included in persistent volume (`/config/database/grocy.db`)

### Access

- **External URL**: `https://grocy.gateway.services.apocrathia.com`
- **Internal Service**: `http://grocy.grocy.svc.cluster.local:80`

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **User Creation**: Users must be manually created in Authentik before first access
3. **Clean Deployment**: Works with Authentik from day one

## Security Considerations

- **SSO Integration**: Complete authentication through Authentik proxy
- **Default Credentials**: Admin/admin credentials should be changed immediately
- **Data Security**: All data stored in persistent volumes with proper permissions
- **Network Policies**: Cilium NetworkPolicy for traffic control

## Troubleshooting

### Common Issues

1. **Authentication Issues**

   ```bash
   # Check Authentik proxy provider
   kubectl -n grocy get authentikprovider proxyprovider grocy-proxy-provider

   # Check user creation in Authentik
   kubectl -n authentik get authentikuser
   ```

2. **Database Issues**

   ```bash
   # Check database file
   kubectl -n grocy exec -it deployment/grocy -- ls -la /config/database

   # Check database permissions
   kubectl -n grocy exec -it deployment/grocy -- ls -la /config/database/grocy.db
   ```

### Health Checks

```bash
# Overall status
kubectl -n grocy get pods,svc,pvc

# Grocy application status
kubectl -n grocy get pods -l app.kubernetes.io/name=grocy

# Check Authentik outpost
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost
```
