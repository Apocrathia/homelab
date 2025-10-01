# ArchiveTeam Warrior

ArchiveTeam Warrior is a virtual archiving appliance that helps with Archive Team archiving efforts. It downloads sites and uploads them to the archive automatically.

## Documentation

- **ArchiveTeam Warrior Wiki**: <https://wiki.archiveteam.org/index.php?title=ArchiveTeam_Warrior>
- **Docker Usage Guide**: <https://wiki.archiveteam.org/index.php?title=ArchiveTeam_Warrior#Advanced_usage_(container_only)>
- **ArchiveTeam Projects**: <https://wiki.archiveteam.org/index.php?title=Warrior_projects>

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

## External Resources

- [ArchiveTeam Warrior Documentation](https://wiki.archiveteam.org/index.php?title=ArchiveTeam_Warrior)
- [Docker Container Usage](<https://wiki.archiveteam.org/index.php?title=ArchiveTeam_Warrior#Advanced_usage_(container_only)>)
- [Active Projects List](https://wiki.archiveteam.org/index.php?title=Warrior_projects)
