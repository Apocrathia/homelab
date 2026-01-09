# ArchiveTeam Warrior

Virtual archiving appliance that helps with Archive Team archiving efforts by downloading and uploading sites to the archive.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[ArchiveTeam Warrior Wiki](https://wiki.archiveteam.org/index.php?title=ArchiveTeam_Warrior)** - Official documentation
- **[Docker Usage Guide](<https://wiki.archiveteam.org/index.php?title=ArchiveTeam_Warrior#Advanced_usage_(container_only)>)** - Container deployment
- **[Active Projects](https://wiki.archiveteam.org/index.php?title=Warrior_projects)** - Current archiving projects

## Overview

This deployment includes:

- ArchiveTeam Warrior container with web interface
- Authentik integration for secure access
- Automatic project selection and execution

## Usage

1. **Access**: Navigate to `https://archiveteam-warrior.gateway.services.apocrathia.com`
2. **Authentication**: Login via Authentik SSO
3. **Project Selection**: Choose an active project from the Warrior interface
4. **Monitoring**: View progress and statistics in the web UI

## Configuration

The Warrior runs with default settings and automatically:

- Fetches available projects from the tracker
- Downloads and processes items
- Uploads completed work to the archive
- Updates code every hour

## Troubleshooting

```bash
# Pod status
kubectl get pods -n archiveteam-warrior

# Application logs
kubectl logs -n archiveteam-warrior deployment/archiveteam-warrior -f

# Check Authentik outpost
kubectl get pods -n authentik | grep archiveteam
```
