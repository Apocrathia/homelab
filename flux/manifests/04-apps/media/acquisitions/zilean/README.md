# Zilean

Zilean is a content search and indexing service that aggregates torrent metadata from DebridMediaManager (DMM) and other sources, serving content through Torznab API for integration with Prowlarr and Servarr applications.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Zilean Documentation](https://ipromknight.github.io/zilean/)** - Official documentation
- **[Zilean DeepWiki](https://deepwiki.com/iPromKnight/zilean)** - DeepWiki documentation
- **[Zilean GitHub](https://github.com/iPromKnight/zilean)** - Source code and issues

## Overview

This deployment includes:

- Torznab API for integration with Prowlarr, Sonarr, Radarr
- DMM hashlist scraping for content discovery
- IMDB metadata matching for content classification
- PostgreSQL database for metadata persistence
- Ingestion from Zurg instances and other Zilean peers (configurable)

## Configuration

### 1Password Secrets

Create a 1Password item:

#### zilean-secrets (`vaults/Secrets/items/zilean-secrets`)

- `username`: PostgreSQL database user (defaults to `zilean`)
- `password`: PostgreSQL database password
- `connectionString`: Full PostgreSQL connection string for Zilean:

  ```text
  Host=zilean-postgres-rw.zilean.svc.cluster.local;Database=zilean;Username=zilean;Password=<password>;Include Error Detail=true;Timeout=30;CommandTimeout=3600;
  ```

### Storage

- **PostgreSQL**: 10GB Longhorn persistent volume for database storage
- **Application Data**: 5GB Longhorn persistent volume at `/app/data` for settings and runtime data

### Access

- **Internal Service**: `http://zilean.zilean.svc.cluster.local`
- **Torznab API**: `http://zilean.zilean.svc.cluster.local/torznab/api`
- **API Docs**: `http://zilean.zilean.svc.cluster.local/scalar/v2`

> **Note**: No external access configured - Prowlarr connects directly via cluster DNS.

## Authentication

Zilean uses its own API key authentication:

- **API Key**: Auto-generated on first run, stored in `/app/data/settings.json`
- **Torznab Clients**: Use the API key when configuring indexers in Prowlarr

## Integration

### Prowlarr / Servarr Stack

Zilean provides a Torznab-compatible API for integration with Prowlarr:

- **Torznab URL**: `http://zilean.zilean.svc.cluster.local:8181/torznab/api`
- **API Key**: Retrieved from Zilean's settings after initial startup

### Ingestion Sources

Zilean can scrape additional sources (configure via web UI or `settings.json`):

- **Zurg Instances**: `/debug/torrents` endpoint scraping
- **Other Zilean Instances**: Cross-instance data sharing
- **Generic Endpoints**: Custom HTTP endpoints

## Troubleshooting

### Common Issues

1. **PostgreSQL Connection Issues**

   ```bash
   # Check PostgreSQL cluster status
   kubectl get cluster zilean-postgres -n zilean

   # Check PostgreSQL pods
   kubectl get pods -l cnpg.io/cluster=zilean-postgres -n zilean

   # View PostgreSQL logs
   kubectl logs -l cnpg.io/cluster=zilean-postgres -n zilean
   ```

2. **Zilean Application Issues**

   ```bash
   # Check Zilean pod status
   kubectl get pods -l app=zilean -n zilean

   # View application logs
   kubectl logs -l app=zilean -n zilean

   # Check health endpoint
   kubectl exec -it deployment/zilean -n zilean -- curl -s http://localhost:8181/healthchecks/ping
   ```

3. **Configuration Issues**

   ```bash
   # Check settings file exists
   kubectl exec -it deployment/zilean -n zilean -- ls -la /app/data/

   # Verify connection string is set
   kubectl exec -it deployment/zilean -n zilean -- env | grep Zilean__
   ```

### Health Checks

```bash
# Overall status
kubectl get pods,svc,pvc,cluster -n zilean

# Zilean application status
kubectl get pods -l app=zilean -n zilean

# PostgreSQL cluster status
kubectl get cluster zilean-postgres -n zilean

# Check service connectivity
kubectl get svc -n zilean
```
