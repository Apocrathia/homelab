# ArchiveTeam Warrior

Archive Team's volunteer archiving appliance: downloads sites and uploads them to the archive.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- ArchiveTeam Warrior container with web interface
- Authentik integration
- Automatic project selection and execution

## Usage

1. Open `https://archiveteam-warrior.gateway.services.apocrathia.com` and log in via Authentik SSO
2. Pick an active project in the Warrior interface

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

## References

- **[ArchiveTeam Warrior Wiki](https://wiki.archiveteam.org/index.php?title=ArchiveTeam_Warrior)** - Official documentation
- **[Docker Usage Guide](https://wiki.archiveteam.org/index.php?title=ArchiveTeam_Warrior#Advanced_usage_%28container_only%29)** - Container deployment
- **[Active Projects](https://wiki.archiveteam.org/index.php?title=Warrior_projects)** - Current archiving projects
