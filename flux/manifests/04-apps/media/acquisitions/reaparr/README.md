# Reaparr

Cross-platform media management tool for downloading content from other Plex servers and adding it to your personal library.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[GitHub Repository](https://github.com/Reaparr/Reaparr)** - Source code and releases
- **[Docker Hub](https://hub.docker.com/r/reaparr/reaparr)** - Container images

## Overview

This deployment includes:

- Multi-threaded downloading from remote Plex servers
- Automatic file merging and organization
- Integration with local Plex libraries
- Web-based management interface
- Authentik SSO via proxy provider

## Configuration

Configuration is handled entirely through the web UI after initial deployment.

### Storage

- **Config**: Longhorn persistent volume for database and settings
- **Downloads**: SMB mount for temporary download storage
- **Movies**: SMB mount for movie library destination
- **TvShows**: SMB mount for TV show library destination

### Access

- **External URL**: `https://reaparr.gateway.services.apocrathia.com`
- **Internal Service**: `http://reaparr.reaparr.svc.cluster.local:80`

## Authentication

Authentication is handled through Authentik proxy provider with header-based auth:

1. **Authentik Outpost**: Proxies requests and handles SSO
2. **Header Auth**: Reaparr receives authenticated user via `X-authentik-username` header
3. **Trusted Proxy**: Configured via `ReaparrSettings.json` (not available in web UI)

## Initial Setup

1. Access the web UI via the external URL
2. Complete the initial setup wizard to create admin credentials
3. Connect your Plex accounts and configure library destinations

## Configuring Header Authentication

Header auth settings are **not available in the web UI** - they must be configured by editing `/Config/ReaparrSettings.json` in the pod.

### Steps

1. Exec into the pod and edit the config:

   ```bash
   kubectl exec -n reaparr -it deploy/reaparr -- vi /Config/ReaparrSettings.json
   ```

2. Add or modify the `AuthenticationSettings` section:

   ```json
   {
     "AuthenticationSettings": {
       "ResetCredentials": false,
       "HeaderAuthentication": {
         "Enabled": true,
         "MappingType": "Username",
         "TrustedProxies": ["10.0.0.0/8"],
         "EnableLogging": true,
         "MaxHeaderLength": 256,
         "RequireHttps": false
       }
     }
   }
   ```

3. Restart the pod to apply changes:

   ```bash
   kubectl rollout restart -n reaparr deploy/reaparr
   ```

### Configuration Options

| Setting          | Description                                                        |
| ---------------- | ------------------------------------------------------------------ |
| `Enabled`        | Enable/disable header authentication                               |
| `MappingType`    | `Username` or `Email` - how header value maps to Reaparr user      |
| `TrustedProxies` | List of IP/CIDR ranges to trust (use `10.0.0.0/8` for pod network) |
| `EnableLogging`  | Log header auth attempts                                           |
| `RequireHttps`   | Require HTTPS for header auth (set `false` for internal traffic)   |

### Environment Variables

| Variable                 | Default       | Description                                                                     |
| ------------------------ | ------------- | ------------------------------------------------------------------------------- |
| `AUTH_HEADER_TOKEN_NAME` | `X-Auth-User` | Header name to read username from (set to `X-authentik-username` for Authentik) |

## Troubleshooting

### Common Issues

1. **Pod not starting**

   ```bash
   # Check pod status and events
   kubectl get pods -n reaparr
   kubectl describe pod -n reaparr -l app=reaparr

   # View logs
   kubectl logs -n reaparr -l app=reaparr
   ```

2. **SMB mount issues**

   ```bash
   # Check PVC status
   kubectl get pvc -n reaparr

   # Check PV status
   kubectl get pv | grep reaparr
   ```

### Health Checks

```bash
# Overall status
kubectl get pods,svc,pvc -n reaparr

# Authentik outpost status
kubectl get pods -n authentik -l app.kubernetes.io/name=ak-outpost-reaparr-outpost
```
