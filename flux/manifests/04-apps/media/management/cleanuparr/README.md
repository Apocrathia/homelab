# Cleanuparr

Automated download management system that monitors and cleans up unwanted or blocked files in Sonarr, Radarr, and download clients.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Cleanuparr Documentation](https://cleanuparr.github.io/Cleanuparr/)** - Primary documentation source
- **[Cleanuparr GitHub](https://github.com/Cleanuparr/Cleanuparr)** - Source code and issues
- **[DeepWiki Cleanuparr](https://deepwiki.com/Cleanuparr/Cleanuparr)** - Technical architecture details

## Overview

This deployment includes:

- Cleanuparr automated download cleanup system
- Official Cleanuparr container with .NET runtime
- Authentik SSO integration for secure access
- Longhorn persistent storage for configuration
- Integration with \*Arr applications and download clients

## Features

- **Strike System**: Marks bad downloads and removes those exceeding threshold
- **Import Failure Detection**: Removes downloads failing to be imported by \*Arr apps
- **Stalled Download Cleanup**: Removes stalled or metadata downloading torrents
- **Malware Protection**: Blocks known malware patterns and malicious files
- **Speed Monitoring**: Removes downloads with low speed or high completion time
- **Seeding Management**: Cleans up downloads after specified seeding time
- **Orphan Detection**: Removes orphaned downloads with no hardlinks
- **Automatic Replacement**: Triggers search for removed content

## Configuration

### Security Configuration

The deployment uses standard .NET container security:

- Runs as non-root user (1000:1000)
- Read-only root filesystem disabled for .NET runtime requirements
- File system group change policy for volume ownership
- No privilege escalation required

### Storage

- **Configuration Volume**: 5GB Longhorn persistent volume for application configuration and database

### Access

- **External URL**: `https://cleanuparr.gateway.services.apocrathia.com`
- **Internal Service**: `http://cleanuparr.cleanuparr.svc.cluster.local:11011`

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Automatic Setup**: HTTPRoute and outpost created automatically
3. **Clean Deployment**: Works with Authentik from day one

## Integration

Cleanuparr integrates with:

### \*Arr Applications

- Sonarr, Radarr, Lidarr, Readarr, Whisparr

### Download Clients

- qBittorrent, Transmission, Deluge, µTorrent

### Configuration Requirements

After deployment, configure Cleanuparr through the web interface:

1. **Download Clients**: Add your download client configurations
2. **\*Arr Applications**: Configure connections to your \*Arr instances
3. **Cleanup Rules**: Set up strike thresholds and cleanup policies
4. **Notifications**: Configure notification providers (optional)

## Security Considerations

- **SSO Integration**: Complete authentication through Authentik proxy
- **Non-root Execution**: Runs as unprivileged user for security
- **Network Policies**: Cilium NetworkPolicy for traffic control
- **Malware Protection**: Built-in malware detection and blocking

## Troubleshooting

### Common Issues

1. **Download Client Connection Issues**

   ```bash
   # Check Cleanuparr logs
   kubectl -n cleanuparr logs -l app.kubernetes.io/name=cleanuparr

   # Test download client connectivity
   kubectl -n cleanuparr exec -it deployment/cleanuparr -- curl -I http://qbittorrent:8080
   ```

2. **Configuration Access**

   ```bash
   # Check configuration volume
   kubectl -n cleanuparr exec -it deployment/cleanuparr -- ls -la /config

   # Verify database file
   kubectl -n cleanuparr exec -it deployment/cleanuparr -- ls -la /config/*.db
   ```

### Health Checks

```bash
# Overall status
kubectl -n cleanuparr get pods,svc,pvc

# Cleanuparr application status
kubectl -n cleanuparr get pods -l app.kubernetes.io/name=cleanuparr

# Check Authentik outpost
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost
```

### Logs

```bash
# Application logs
kubectl -n cleanuparr logs -l app.kubernetes.io/name=cleanuparr -f

# Check for errors
kubectl -n cleanuparr logs -l app.kubernetes.io/name=cleanuparr | grep -i error
```
