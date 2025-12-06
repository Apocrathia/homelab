# BitMagnet

BitMagnet is a self-hosted BitTorrent indexer, DHT crawler, content classifier, and torrent search engine with web UI, GraphQL API, and Servarr stack integration.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[BitMagnet DeepWiki](https://deepwiki.com/bitmagnet-io/bitmagnet)** - Primary documentation source
- **[BitMagnet GitHub](https://github.com/bitmagnet-io/bitmagnet)** - Source code and issues
- **[BitMagnet Website](https://bitmagnet.io/)** - Official website

## Overview

This deployment includes:

- DHT crawler for discovering torrents from the BitTorrent network
- Content classifier for identifying and categorizing media content
- GraphQL API for programmatic access
- Web UI for browsing and searching torrents
- PostgreSQL database for metadata persistence
- TMDB integration for enhanced metadata (optional)

## Configuration

### 1Password Secrets

Create a 1Password item:

#### bitmagnet-secrets (`vaults/Secrets/items/bitmagnet-secrets`)

- `username`: PostgreSQL database user (defaults to `bitmagnet`)
- `password`: PostgreSQL database password
- `tmdb-api-key`: (Optional) TMDB API key for enhanced metadata. If not provided, BitMagnet uses a shared API key with rate limits.

### Storage

- **PostgreSQL**: 20GB Longhorn persistent volume for database storage
- **No application storage**: BitMagnet is stateless and stores all data in PostgreSQL

### Access

- **External URL**: `https://bitmagnet.gateway.services.apocrathia.com`
- **Internal Service**: `http://bitmagnet.bitmagnet.svc.cluster.local:80`
- **GraphQL API**: `https://bitmagnet.gateway.services.apocrathia.com/graphql`

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Automatic Setup**: HTTPRoute and outpost created automatically
3. **Clean Deployment**: Works with Authentik from day one

## Integration

### Servarr Stack

BitMagnet provides a Torznab API endpoint for integration with Sonarr, Radarr, and other Servarr applications:

- **Torznab URL**: `https://bitmagnet.gateway.services.apocrathia.com/torznab`
- **API Key**: Configured through the BitMagnet web UI

### TMDB Integration

TMDB integration is optional but recommended for enhanced metadata:

- **Rate Limits**: Shared API key (1 req/sec) vs personal key (20 req/sec)
- **Configuration**: Set `TMDB_API_KEY` environment variable or disable with `TMDB_ENABLED=false`
- **Benefits**: Better content classification and metadata enrichment

## Security Considerations

- **DHT Crawling**: BitMagnet crawls the public DHT network; no VPN required for this operation
- **SSO Integration**: Complete authentication through Authentik proxy
- **Network Policies**: Kubernetes network policies restrict traffic flow
- **Database Security**: PostgreSQL credentials stored in 1Password, never in code

## Troubleshooting

### Common Issues

1. **PostgreSQL Connection Issues**

   ```bash
   # Check PostgreSQL cluster status
   kubectl -n bitmagnet get cluster bitmagnet-postgres

   # Check PostgreSQL pods
   kubectl -n bitmagnet get pods -l cnpg.io/cluster=bitmagnet-postgres

   # View PostgreSQL logs
   kubectl -n bitmagnet logs -l cnpg.io/cluster=bitmagnet-postgres
   ```

2. **BitMagnet Application Issues**

   ```bash
   # Check BitMagnet pod status
   kubectl -n bitmagnet get pods -l app=bitmagnet

   # View application logs
   kubectl -n bitmagnet logs -l app=bitmagnet

   # Check health status via GraphQL
   kubectl -n bitmagnet exec -it deployment/bitmagnet -- curl -s http://localhost:3333/graphql -H "Content-Type: application/json" -d '{"query":"{ health { status } }"}'
   ```

3. **Database Migration Issues**

   ```bash
   # Check if database is ready
   kubectl -n bitmagnet get cluster bitmagnet-postgres -o jsonpath='{.status.conditions[?(@.type=="ClusterReady")].status}'

   # Verify database connection from pod
   kubectl -n bitmagnet exec -it deployment/bitmagnet -- env | grep POSTGRES
   ```

### Health Checks

```bash
# Overall status
kubectl -n bitmagnet get pods,svc,pvc,cluster

# BitMagnet application status
kubectl -n bitmagnet get pods -l app=bitmagnet

# PostgreSQL cluster status
kubectl -n bitmagnet get cluster bitmagnet-postgres

# Check service connectivity
kubectl -n bitmagnet get svc
```
