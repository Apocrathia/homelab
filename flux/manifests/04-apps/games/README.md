# Games

Game support services for managing, organizing, and playing games in the homelab.

> **Navigation**: [← Back to Apps README](../README.md)

## Applications

### [AMP Exporter](./amp-exporter/README.md)

Prometheus exporter for CubeCoders AMP game servers, with a Grafana dashboard
in the Games folder.

### [ArchiSteamFarm](./archisteamfarm/README.md)

Steam card farming application for idling multiple accounts simultaneously with Authentik SSO integration and secure configuration management.

### [rom-audit](./rom-audit/README.md)

Weekly CronJob that audits ROM files on the Emulation share against No-Intro
DATs and reports `matched` / `wrong_name` / `unknown` per system.

### [ROMM](./romm/README.md)

ROM Manager for organizing, scanning, and playing retro games with metadata enrichment and web-based emulation.

### [Skyscraper](./skyscraper/README.md)

Weekly Gemba Skyscraper CronJob that regenerates ES-DE `gamelist.xml` metadata
from ScreenScraper onto the Emulation share (media downloads disabled; separate
from RomM).

### [ES-DE themes](./esde-themes/README.md)

Weekly CronJob that mirrors the official ES-DE themes list into
`Emulation/themes/` on the share.

### [Moonlight Web](./moonlight-web/README.md)

Browser Moonlight client for Sunshine hosts, fronted by Authentik. Streams over
WebSocket (no UDP LoadBalancer).

## Overview

Game support services cover ROM management, web emulation helpers, ES-DE
gamelist scraping, theme mirroring, browser Sunshine streaming, and AMP metrics
export. Deployed via Flux; game server hosting stays on `game.apocrathia.com`
via [AMP](https://cubecoders.com/AMP).

## References

- **[amp-cubecoders-exporter](https://github.com/soynx/amp-cubecoders-exporter)** - AMP Prometheus exporter
- **[ArchiSteamFarm](https://github.com/JustArchiNET/ArchiSteamFarm)** - Steam card farming
- **[Moonlight Web](https://github.com/MrCreativ3001/moonlight-web-stream)** - Browser Sunshine client
- **[ROMM](https://github.com/rommapp/romm)** - ROM management
- **[Skyscraper](https://github.com/Gemba/skyscraper)** - ES-DE gamelist scraping
- **[ES-DE themes-list](https://gitlab.com/es-de/themes/themes-list)** - Theme catalog mirrored by esde-themes
