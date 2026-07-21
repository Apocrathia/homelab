# Games

Game support services for managing, organizing, and playing games in the homelab.

> **Navigation**: [← Back to Apps README](../README.md)

## Applications

### [ArchiSteamFarm](./archisteamfarm/README.md)

Steam card farming application for idling multiple accounts simultaneously with Authentik SSO integration and secure configuration management.

### [ROMM](./romm/README.md)

ROM Manager for organizing, scanning, and playing retro games with metadata enrichment and web-based emulation.

### [Skyscraper](./skyscraper/README.md)

Weekly Gemba Skyscraper CronJob that regenerates ES-DE `gamelist.xml` metadata
from ScreenScraper onto the Emulation share (media downloads disabled; separate
from RomM).

## Overview

Game support services cover ROM management, web emulation helpers, and ES-DE
gamelist scraping. Deployed via Flux; game server hosting stays on
`game.apocrathia.com` via [AMP](https://cubecoders.com/AMP).

## References

- **[ArchiSteamFarm](https://github.com/JustArchiNET/ArchiSteamFarm)** - Steam card farming
- **[ROMM](https://github.com/rommapp/romm)** - ROM management
- **[Skyscraper](https://github.com/Gemba/skyscraper)** - ES-DE gamelist scraping
