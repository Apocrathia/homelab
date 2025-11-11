# ChangeDetection.io

Website change detection and monitoring service with notification support.

> **Navigation**: [← Back to Management README](../README.md)

## Documentation

- **[ChangeDetection.io Documentation](https://github.com/dgtlmoon/changedetection.io/wiki)** - Primary documentation source
- **[ChangeDetection.io GitHub](https://github.com/dgtlmoon/changedetection.io)** - Source code and issues

## Overview

This deployment includes:

- Website change detection and monitoring
- Browser automation with JavaScript support
- Multiple notification channels
- Content filtering and visual selectors
- Authentik SSO integration for secure access

## Configuration

### Storage

- **Data Volume**: 5GB Longhorn persistent volume for watch configurations and snapshots (`/datastore`)
- **Temp Volume**: EmptyDir volume for sockpuppet browser processing (`/tmp`)

### Access

- **External URL**: `https://changedetection.gateway.services.apocrathia.com`
- **Internal Service**: `http://changedetection.changedetection.svc.cluster.local:5000`

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Automatic Setup**: HTTPRoute and outpost created automatically
3. **Clean Deployment**: Works with Authentik from day one

## Security Considerations

- **SSO Integration**: Complete authentication through Authentik proxy
- **Browser Security**: LinuxServer.io container with browserless Chrome sidecar
- **Data Privacy**: Watch configurations stored securely in persistent volumes
- **Network Policies**: Cilium NetworkPolicy for traffic control

## Troubleshooting

### Common Issues

1. **Browser Automation Issues**

   ```bash
   # Check browserless Chrome sidecar
   kubectl -n changedetection get pods -l app.kubernetes.io/component=browserless

   # Check ChangeDetection logs
   kubectl -n changedetection logs deployment/changedetection --tail=50
   ```

2. **Storage Issues**

   ```bash
   # Check data volume
   kubectl -n changedetection get pvc

   # Check storage access
   kubectl -n changedetection exec -it deployment/changedetection -- ls -la /datastore
   ```

### Health Checks

```bash
# Overall status
kubectl -n changedetection get pods,svc,pvc

# ChangeDetection application status
kubectl -n changedetection get pods -l app.kubernetes.io/name=changedetection

# Check Authentik outpost
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost
```
