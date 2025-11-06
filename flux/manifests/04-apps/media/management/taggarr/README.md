# Taggarr

Media tagging utility that scans and tags anime shows based on dubbed audio track availability, enabling filtering by dubbed content in Sonarr and media players.

> **Navigation**: [← Back to Media README](../README.md)

## Documentation

- **[Taggarr GitHub](https://github.com/BassHous3/taggarr)** - Source code and issues
- **[Taggarr Docker Hub](https://hub.docker.com/r/basshous3/taggarr)** - Container image

## Overview

This deployment includes:

- Taggarr media scanning and tagging system
- Single-container pod for anime scanning
- Python-based container for audio track analysis
- Longhorn persistent storage for configuration
- SMB mount for Anime media library
- Integration with Sonarr for tag management

## Features

- **Audio Track Analysis**: Scans media files to identify audio track languages
- **Automated Tagging**: Tags shows in Sonarr based on dub availability
- **Tag Categories**: NO TAG, DUB, SEMI-DUB, WRONG-DUB classifications
- **Genre Integration**: Optional genre tagging for dubbed content
- **JSON Indexing**: Saves scan results to JSON file in media root
- **Incremental Scanning**: Only scans new or modified folders after initial scan

## Configuration

### 1Password Secrets

Create a 1Password item at `vaults/Secrets/items/taggarr-secrets`:

- `sonarr-api-key`: Sonarr API key for tag management

### Environment Variables

Key configuration options (see `helmrelease.yaml` for complete list):

- `ROOT_TV_PATH`: Root directory for media library (required, defaults to `/anime`)
- `SONARR_URL`: Internal cluster URL to Sonarr instance
- `TARGET_LANGUAGES`: Comma-separated list of target languages (e.g., "english, french")
- `TARGET_GENRE`: Genre filter (set to "Anime" for anime scanning)
- `RUN_INTERVAL_SECONDS`: Scan interval (default: 7200 seconds / 2 hours)
- `QUICK_MODE`: Only scan first video of each season (default: false)
- `DRY_RUN`: Test mode without writing tags (default: false)
- `LOG_LEVEL`: Logging verbosity (DEBUG/INFO/WARNING/ERROR)

### Storage

- **Configuration Volume**: 5GB Longhorn persistent volume for application configuration and scan index
- **Anime Media Volume**: SMB mount to Anime library for media scanning

### Container Architecture

Taggarr runs as a single-container pod:

- **Main Container** (`taggarr`): Scans Anime directory at `/anime`
  - Uses `ROOT_TV_PATH=/anime`
  - Filters by `TARGET_GENRE=Anime` for anime-specific content

## Integration

Taggarr integrates with:

### Sonarr

- Reads show metadata and episode information
- Applies tags based on audio track analysis
- Optional genre tagging for dubbed content

### Media Files

- Scans anime media library for audio track information
- Reads audio track names (not actual audio content)
- Saves scan results to JSON file in media root

## Tag Meanings

- **NO TAG**: Show only in original language
- **DUB**: Show contains all target languages
- **SEMI-DUB**: Show missing at least one target language or some episodes missing dub
- **WRONG-DUB**: Show missing target languages but contains other languages (excluding original)

## Security Considerations

- **Non-root Execution**: Runs as unprivileged user (1000:1000) for security
- **Read-only Media**: SMB mounts configured for read access to media files
- **Secret Management**: Sonarr API key stored in 1Password

## Troubleshooting

### Common Issues

1. **Sonarr Connection Issues**

   ```bash
   # Check container logs
   kubectl -n taggarr logs deployment/taggarr -c taggarr

   # Test Sonarr connectivity
   kubectl -n taggarr exec -it deployment/taggarr -c taggarr -- curl -I http://sonarr.sonarr.svc.cluster.local
   ```

2. **Media Access Issues**

   ```bash
   # Check anime media mount
   kubectl -n taggarr exec -it deployment/taggarr -c taggarr -- ls -la /anime

   # Verify JSON file creation
   kubectl -n taggarr exec -it deployment/taggarr -c taggarr -- ls -la /anime/taggarr.json
   ```

3. **Tagging Not Working**

   ```bash
   # Check scan logs
   kubectl -n taggarr logs deployment/taggarr -c taggarr | grep -i tag

   # Verify Sonarr API key
   kubectl -n taggarr exec -it deployment/taggarr -c taggarr -- env | grep SONARR_API_KEY
   ```

### Health Checks

```bash
# Overall status
kubectl -n taggarr get pods,svc,pvc

# Pod status (both containers)
kubectl -n taggarr get pods -l app.kubernetes.io/name=taggarr

# Check container status
kubectl -n taggarr describe pod -l app.kubernetes.io/name=taggarr
```

### Logs

```bash
# Container logs
kubectl -n taggarr logs deployment/taggarr -c taggarr -f

# Check for errors
kubectl -n taggarr logs deployment/taggarr -c taggarr | grep -i error
```
