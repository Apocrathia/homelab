# Games

Services for managing and playing games in the homelab.

> **Navigation**: [← Back to Apps README](../README.md)

## Applications

### [AMP Exporter](./amp-exporter/README.md)

Prometheus exporter for CubeCoders AMP game servers, with a Grafana dashboard
in the Games folder.

### [ArchiSteamFarm](./archisteamfarm/README.md)

Steam card farming across multiple accounts, behind Authentik SSO.

### [rom-audit](./rom-audit/README.md)

Weekly CronJob that audits ROM files on the Emulation share against No-Intro
DATs and reports `matched` / `wrong_name` / `unknown` per system.

### [ROMM](./romm/README.md)

Retro-game ROM manager with metadata and browser emulation.

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

Deployed via Flux. Game server hosting itself stays on
`game.services.apocrathia.com` via [AMP](https://cubecoders.com/AMP).

## References

- **[amp-cubecoders-exporter](https://github.com/soynx/amp-cubecoders-exporter)** - AMP Prometheus exporter
- **[ArchiSteamFarm](https://github.com/JustArchiNET/ArchiSteamFarm)** - Steam card farming
- **[Moonlight Web](https://github.com/MrCreativ3001/moonlight-web-stream)** - Browser Sunshine client
- **[ROMM](https://github.com/rommapp/romm)** - ROM management
- **[Skyscraper](https://github.com/Gemba/skyscraper)** - ES-DE gamelist scraping
- **[ES-DE themes-list](https://gitlab.com/es-de/themes/themes-list)** - Theme catalog mirrored by esde-themes
