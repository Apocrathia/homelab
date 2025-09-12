# ROMM - ROM Manager

Self-hosted ROM management platform for organizing, scanning, and playing retro games with metadata enrichment and web-based emulation.

## Architecture

- **Backend**: FastAPI + SQLAlchemy + PostgreSQL + Valkey (internal)
- **Frontend**: Vue.js 3 + Vuetify + Pinia
- **Emulation**: EmulatorJS, Ruffle, DOSBox Pure
- **Metadata**: IGDB, ScreenScraper, MobyGames, SteamGridDB
- **Authentication**: OIDC via Authentik

## Current Deployment Status

**Working Configuration**: ROMM is successfully deployed with the following setup:

- **Database**: PostgreSQL via CloudNativePG
- **Storage**: Longhorn PVC for `/romm/resources` (persistent), EmptyDir for `/romm/assets` (temporary)
- **ROM Library**: SMB mount for game files
- **Authentication**: OIDC integration with Authentik
- **Security**: Read-only root filesystem with proper volume permissions

**Known Limitations**:

- User assets (`/romm/assets`) are stored in EmptyDir and lost on pod restart
- This is a temporary solution pending multi-volume chart support

## Configuration

### 1Password Secrets

Create a 1Password item:

#### romm-secrets (`vaults/Secrets/items/romm-secrets`)

**Database Credentials:**

- `username`: PostgreSQL username (e.g., romm)
- `password`: PostgreSQL password

**Authentication:**

- `auth-secret-key`: ROMM authentication secret key (generate with `openssl rand -hex 32`)

**External API Keys:**

- `igdb-client-id`: IGDB API client ID
- `igdb-client-secret`: IGDB API client secret
- `screenscraper-username`: ScreenScraper username
- `screenscraper-password`: ScreenScraper password
- `steamgriddb-api-key`: SteamGridDB API key
- `retroachievements-api-key`: RetroAchievements API key (optional)

**OIDC Configuration:**

- `oidc-client-id`: Authentik OIDC client ID
- `oidc-client-secret`: Authentik OIDC client secret

### Storage Configuration

**ROM Library**: SMB storage mounted at `/romm/library`

- Source: `//storage.services.apocrathia.com/Games/Emulation`
- Read-only access for ROM files
- Supports all major console platforms

**Application Data**: Longhorn persistent volume at `/romm/resources`

- ROM metadata, covers, and screenshots
- Database files (if using SQLite)
- Application configuration and cache

**User Assets**: EmptyDir volume at `/romm/assets`

- User uploads, avatars, and custom assets
- **Note**: Data is lost on pod restart (temporary solution)
- **Future**: Will be migrated to persistent storage via multi-volume chart support

### Platform Support

ROMM supports 50+ gaming platforms including:

- Nintendo (NES, SNES, N64, GameCube, Wii, Switch, Game Boy, DS, 3DS)
- Sony (PlayStation 1-3, PSP, PS Vita)
- Microsoft (Xbox, Xbox 360, Xbox One)
- Sega (Master System, Genesis, Saturn, Dreamcast)
- PC (DOS, Windows, Linux, Mac)
- Handheld systems

### Emulation

Web-based emulation using:

- **EmulatorJS**: Multi-system emulator (RetroArch WebAssembly)
- **Ruffle**: Flash game emulator
- **DOSBox Pure**: MS-DOS emulator

## Access

- **URL**: `https://romm.gateway.services.apocrathia.com`
- **Authentication**: OIDC via Authentik
- **TLS**: Automatic certificate management

## Features

- **ROM Management**: Automatic scanning and organization
- **Metadata Enrichment**: Covers, screenshots, descriptions
- **Web Emulation**: Play games directly in browser
- **Multi-file Support**: Handle multi-disc games and archives
- **Custom Platforms**: Add support for new systems
- **User Management**: Role-based access control
- **API Integration**: REST API for external tools

## Troubleshooting

### Common Issues

1. **ROM Scanning Issues**

   ```bash
   # Check ROMM logs
   kubectl logs -f deployment/romm -n romm

   # Verify SMB mount
   kubectl exec -it deployment/romm -n romm -- ls -la /romm/library
   ```

2. **Database Connection Issues**

   ```bash
   # Check PostgreSQL connectivity
   kubectl exec -it deployment/romm -n romm -- nc -zv romm-postgres-rw.romm.svc.cluster.local 5432

   # Verify database credentials
   kubectl get secret romm-secrets -n romm -o yaml
   ```

3. **Authentication Issues**

   ```bash
   # Check OIDC configuration
   kubectl describe deployment romm -n romm | grep OIDC

   # Verify Authentik integration
   kubectl get httproute romm -n romm
   ```

### Performance Tuning

- **Resource Limits**: Adjust CPU/memory based on usage
- **Scanning Schedule**: Modify cron schedule for off-peak hours
- **Cache Size**: Increase cache volume for better performance
- **Concurrent Scans**: Limit parallel scanning operations

## Development

### Local Testing

```bash
# Port forward for local access
kubectl port-forward svc/romm 8080:8080 -n romm

# Access at http://localhost:8080
```

### Configuration Updates

1. Update `config.yml` for platform mappings
2. Update `helmrelease.yaml` for environment variables
3. Apply changes: `kubectl apply -k flux/manifests/04-apps/games/romm/`
4. Restart deployment: `kubectl rollout restart deployment/romm -n romm`

### Future Improvements

**Multi-Volume Support**: The generic-app chart will be enhanced to support multiple persistent volumes, enabling:

- Persistent storage for `/romm/assets` (user uploads)
- Separate volumes for different data types
- Better data isolation and backup strategies

**Breaking Changes**: This enhancement will require careful planning and migration of existing deployments using the `generic-app` chart.

## External Integrations

- **Playnite**: Desktop game library manager
- **muOS**: Handheld gaming device
- **Tinfoil**: Nintendo Switch homebrew
- **LaunchBox**: Game launcher and frontend
