# Games

This directory contains game support services and applications for managing, organizing, and playing games in the homelab environment.

## Applications

### [ArchiSteamFarm](./archisteamfarm/README.md)

Steam card farming application for idling multiple accounts simultaneously with Authentik SSO integration and secure configuration management.

### [ROMM](./romm/README.md)

ROM Manager for organizing, scanning, and playing retro games with metadata enrichment and web-based emulation.

## Overview

Game support services provide tools for:

- **ROM Management**: Organization and metadata enrichment for game libraries
- **Web Emulation**: Browser-based gaming for retro consoles
- **Game Library Management**: Centralized storage and access to game collections
- **Metadata Integration**: Automatic cover art, descriptions, and platform information

All applications are deployed via Flux GitOps and integrate with the homelab's authentication, monitoring, and gateway infrastructure. Game server hosting is handled separately at `game.apocrathia.com` using [AMP (Application Management Platform)](https://cubecoders.com/AMP).
