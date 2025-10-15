# ROMM - ROM Manager

Self-hosted ROM management platform for organizing, scanning, and playing retro games with metadata enrichment and web-based emulation.

> **Navigation**: [← Back to Games README](../README.md)

## Documentation

- **[ROMM Documentation](https://romm.app/docs)** - Primary documentation source
- **[ROMM GitHub](https://github.com/rommapp/romm)** - Source code and issues
- **[ROMM Configuration](https://romm.app/docs/configuration)** - Configuration reference

## Overview

This deployment includes:

- ROMM backend with FastAPI + SQLAlchemy + PostgreSQL
- Vue.js 3 frontend with Vuetify + Pinia
- Web-based emulation with EmulatorJS, Ruffle, DOSBox Pure
- Metadata enrichment from IGDB, ScreenScraper, MobyGames, SteamGridDB
- Authentik OIDC integration for secure access

## Configuration

### 1Password Secrets

Create a 1Password item:

#### romm-secrets (`vaults/Secrets/items/romm-secrets`)

- `username`: PostgreSQL username (e.g., romm)
- `password`: PostgreSQL password
- `auth-secret-key`: ROMM authentication secret key (generate with `openssl rand -hex 32`)
- `igdb-client-id`: IGDB API client ID
- `igdb-client-secret`: IGDB API client secret
- `screenscraper-username`: ScreenScraper username
- `screenscraper-password`: ScreenScraper password
- `steamgriddb-api-key`: SteamGridDB API key
- `retroachievements-api-key`: RetroAchievements API key (optional)
- `oidc-client-id`: Authentik OIDC client ID
- `oidc-client-secret`: Authentik OIDC client secret

### Storage

- **Application Data**: Longhorn persistent volume for ROM metadata, covers, and screenshots (`/romm/resources`)
- **ROM Library**: SMB mount for game files (`/romm/library`)
- **User Assets**: EmptyDir volume for user uploads (`/romm/assets`) - **Note**: Data lost on pod restart

### Database

- **Engine**: PostgreSQL (CloudNativePG)
- **Connection**: Internal Kubernetes service (`romm-postgres-rw.romm.svc.cluster.local:5432`)
- **Credentials**: Managed via 1Password Connect

### Access

- **External URL**: `https://romm.gateway.services.apocrathia.com`
- **Internal Service**: `http://romm.romm.svc.cluster.local:8080`

## Authentication

Authentication is handled through Authentik OIDC:

1. **OIDC Provider**: Authentik OIDC provider configured
2. **Client Credentials**: Automatically generated and stored in 1Password
3. **Clean Setup**: Works with Authentik from day one

## Security Considerations

- **OIDC Integration**: Complete authentication through Authentik
- **Database Security**: PostgreSQL credentials managed via 1Password
- **Read-only ROM Access**: ROM library mounted as read-only
- **API Key Security**: External API keys stored securely in 1Password

## Troubleshooting

### Common Issues

1. **ROM Scanning Issues**

   ```bash
   # Check ROMM logs
   kubectl -n romm logs deployment/romm --tail=50

   # Verify SMB mount
   kubectl -n romm exec -it deployment/romm -- ls -la /romm/library
   ```

2. **Database Connection Issues**

   ```bash
   # Check PostgreSQL connectivity
   kubectl -n romm exec -it deployment/romm -- nc -zv romm-postgres-rw.romm.svc.cluster.local 5432

   # Check PostgreSQL cluster status
   kubectl -n romm get cluster romm-postgres
   ```

3. **Authentication Issues**

   ```bash
   # Check OIDC configuration
   kubectl -n romm describe deployment romm | grep OIDC

   # Verify Authentik integration
   kubectl -n romm get httproute romm
   ```

### Health Checks

```bash
# Overall status
kubectl -n romm get pods,svc,pvc

# ROMM application status
kubectl -n romm get pods -l app.kubernetes.io/name=romm

# PostgreSQL cluster status
kubectl -n romm get cluster romm-postgres

# Check Authentik outpost
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost
```
