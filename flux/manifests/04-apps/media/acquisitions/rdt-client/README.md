# RDT-Client

RDT-Client integrates Real-Debrid and other debrid services with Sonarr/Radarr, enabling HTTP downloads from debrid servers instead of traditional torrenting.

> **Navigation**: [← Back to Media README](../README.md)

## Documentation

- **[RDT-Client DeepWiki](https://deepwiki.com/rogerfar/rdt-client)** - Primary documentation source
- **[RDT-Client GitHub](https://github.com/rogerfar/rdt-client)** - Source code and issues

## Overview

This deployment includes:

- RDT-Client web interface for managing debrid downloads
- qBittorrent API emulation for Sonarr/Radarr integration
- Real-Debrid service integration
- Automatic file downloading and organization
- Category-based download routing

## Configuration

All configuration is done through the RDT-Client web UI after initial deployment. The Real-Debrid API token and other settings are stored in the application's SQLite database.

### Storage

- **Configuration Volume**: 10GB Longhorn persistent volume for SQLite database and application configuration
- **Downloads Volume**: SMB mount to shared storage location (`/downloads`)

### Access

- **External URL**: `https://debrid.gateway.services.apocrathia.com`
- **Internal Service**: `http://rdt-client.rdt-client.svc.cluster.local`

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Automatic Setup**: HTTPRoute and outpost created automatically
3. **Clean Deployment**: Works with Authentik from day one

## Integration with Sonarr/Radarr

RDT-Client emulates the qBittorrent API, allowing seamless integration:

1. **Configure Download Client**: Add RDT-Client as a qBittorrent-type download client in Sonarr/Radarr

   - **Host**: `rdt-client.rdt-client.svc.cluster.local`
   - **Port**: `6500`
   - **Category**: Set to `tv` for Sonarr, `movies` for Radarr

2. **Category-Based Routing**: RDT-Client automatically routes downloads to category subdirectories:

   - Sonarr downloads → `/downloads/tv/[Torrent Name]/`
   - Radarr downloads → `/downloads/movies/[Torrent Name]/`

3. **Download Process**: When Sonarr/Radarr sends a torrent:
   - RDT-Client forwards it to Real-Debrid
   - Real-Debrid downloads on their servers
   - RDT-Client downloads via HTTP to your storage
   - Sonarr/Radarr processes files normally

## Security Considerations

- **HTTP Downloads**: No VPN required for Real-Debrid downloads (HTTP, not torrenting)
- **SSO Integration**: Complete authentication through Authentik proxy
- **Network Policies**: Kubernetes network policies restrict traffic flow

## Troubleshooting

### Common Issues

1. **Real-Debrid Connection Issues**

   ```bash
   # Check RDT-Client logs
   kubectl -n rdt-client logs -l app.kubernetes.io/name=rdt-client

   # Check pod status
   kubectl -n rdt-client get pods
   ```

2. **Download Storage Issues**

   ```bash
   # Check downloads volume mount
   kubectl -n rdt-client exec -it deployment/rdt-client -- mount | grep storage

   # Test download directory access
   kubectl -n rdt-client exec -it deployment/rdt-client -- ls -la /downloads
   ```

3. **Sonarr/Radarr Integration Issues**

   ```bash
   # Verify RDT-Client API is accessible
   kubectl -n rdt-client exec -it deployment/rdt-client -- curl -s http://localhost:6500/api/v2/app/version

   # Check service connectivity
   kubectl -n rdt-client get svc
   ```

### Health Checks

```bash
# Overall status
kubectl -n rdt-client get pods,svc,pvc

# RDT-Client application status
kubectl -n rdt-client get pods -l app.kubernetes.io/name=rdt-client

# Check configuration volume
kubectl -n rdt-client get pvc
```
