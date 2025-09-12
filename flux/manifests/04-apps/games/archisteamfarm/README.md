# ArchiSteamFarm

ArchiSteamFarm (ASF) is a C# application with primary purpose of idling Steam cards from multiple accounts simultaneously.

## Configuration

### Secrets Management

Configuration files are managed through 1Password Item Custom Resources and injected via init container:

- `ASF.json` - Global configuration with IPC password, Steam owner ID, trade tokens
- `Apocrathia.json` - Bot-specific configuration with Steam credentials
- `IPC.config` - IPC server configuration
- `freegames.json.config` - Free games plugin configuration

Secrets are stored in 1Password at `vaults/Secrets/items/archisteamfarm-secrets` and automatically synced to the cluster.

### Persistent Storage

- **Config volume**: 2Gi Longhorn PV mounted at `/app/config`
- **Plugins volume**: 1Gi Longhorn PV mounted at `/app/plugins`
- **Temp volume**: EmptyDir mounted at `/tmp`

### Access

- **Web Interface**: https://asf.gateway.services.apocrathia.com
- **IPC API**: Port 1242 (internal cluster access)
- **Authentik Integration**: Enabled with custom icon and display name

## Deployment Notes

The deployment uses an init container to copy secrets from Kubernetes secrets to the config volume before ASF starts. This approach allows for secure secret management while maintaining the expected file structure for ASF. A better mechanism for this should be implemented in the future.
