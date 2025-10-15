# ArchiSteamFarm

C# application for idling Steam cards from multiple accounts simultaneously with web interface.

> **Navigation**: [← Back to Games README](../README.md)

## Documentation

- **[ArchiSteamFarm Documentation](https://github.com/JustArchiNET/ArchiSteamFarm/wiki)** - Primary documentation source
- **[ArchiSteamFarm GitHub](https://github.com/JustArchiNET/ArchiSteamFarm)** - Source code and issues
- **[ASF Configuration](https://github.com/JustArchiNET/ArchiSteamFarm/wiki/Configuration)** - Configuration reference

## Overview

This deployment includes:

- ArchiSteamFarm with multi-account Steam card idling
- Web interface for monitoring and control
- IPC API for external integrations
- Authentik SSO integration for secure access
- Persistent storage for configuration and plugins

## Configuration

### 1Password Secrets

Create a 1Password item:

#### archisteamfarm-secrets (`vaults/Secrets/items/archisteamfarm-secrets`)

- `ASF.json`: Global configuration with IPC password, Steam owner ID, trade tokens
- `Apocrathia.json`: Bot-specific configuration with Steam credentials
- `IPC.config`: IPC server configuration
- `freegames.json.config`: Free games plugin configuration

### Storage

- **Configuration Volume**: 2GB Longhorn persistent volume for ASF configuration (`/app/config`)
- **Plugins Volume**: 1GB Longhorn persistent volume for ASF plugins (`/app/plugins`)
- **Temp Volume**: EmptyDir volume for temporary files (`/tmp`)

### Access

- **External URL**: `https://asf.gateway.services.apocrathia.com`
- **Internal Service**: `http://archisteamfarm.archisteamfarm.svc.cluster.local:1242`

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Custom Integration**: Custom icon and display name configured
3. **Clean Deployment**: Works with Authentik from day one

## Security Considerations

- **Secret Management**: Configuration files managed via 1Password Item CRs
- **Init Container**: Secrets copied to config volume before ASF starts
- **SSO Integration**: Complete authentication through Authentik proxy
- **IPC Security**: IPC API accessible only within cluster

## Troubleshooting

### Common Issues

1. **Configuration Issues**

   ```bash
   # Check configuration files
   kubectl -n archisteamfarm exec -it deployment/archisteamfarm -- ls -la /app/config

   # Check ASF logs
   kubectl -n archisteamfarm logs deployment/archisteamfarm --tail=50
   ```

2. **Steam Connection Issues**

   ```bash
   # Check network connectivity
   kubectl -n archisteamfarm exec -it deployment/archisteamfarm -- nc -zv steamcommunity.com 443

   # Check Steam API access
   kubectl -n archisteamfarm exec -it deployment/archisteamfarm -- curl -s https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/
   ```

### Health Checks

```bash
# Overall status
kubectl -n archisteamfarm get pods,svc,pvc

# ArchiSteamFarm application status
kubectl -n archisteamfarm get pods -l app.kubernetes.io/name=archisteamfarm

# Check Authentik outpost
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost
```
