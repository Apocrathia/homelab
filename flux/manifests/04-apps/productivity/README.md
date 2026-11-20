# Productivity

Workflow automation, search, and knowledge management tools.

> **Navigation**: [← Back to Apps README](../README.md)

## Overview

Workflow, search, and knowledge tools live here. Deployed via Flux; external
access goes through the `main-gateway` with Gateway API HTTPRoutes, and app
routes follow the `<app>.gateway.services.apocrathia.com` convention.

## Applications

### [ChangeDetection.io](./changedetection-io/README.md)

Website change detection and monitoring with notification support.

### [CryptPad](./cryptpad/README.md)

End-to-end encrypted collaboration suite with real-time document editing.

### [DeckCraft](./deckcraft/README.md)

Presentations and slide shows in the browser: an open-source ArtCraft
creative tool in pure Rust, deployed as a static client-side WASM app.

### [Endurain](./endurain/README.md)

Self-hosted fitness tracking: activity uploads, workouts, body metrics, and health stats.

### [Excalidraw](./excalidraw/README.md)

Virtual whiteboard for sketching diagrams and hand-drawn visuals.

### [GridCraft](./gridcraft/README.md)

Spreadsheet in the browser: an open-source ArtCraft creative tool in pure
Rust, deployed as a static client-side WASM app.

### [Kiwix](./kiwix/README.md)

Offline Wikipedia and content library server with automated ZIM updates.

### [n8n](./n8n/README.md)

Workflow automation platform for connecting services and APIs.

### [OmniTools](./omni-tools/README.md)

100+ client-side web tools: image, PDF, text, and data utilities that run entirely in the browser.

### [ProjectSend](./projectsend/README.md)

Client-facing file sharing with per-client portals: friends sign in via
Authentik OIDC and are auto-provisioned as clients, uploading to the shared
NAS `Uploads` share.

### [rclone](./rclone/README.md)

Cloud storage synchronization and management.

### [SearXNG](./searxng/README.md)

Privacy-respecting metasearch engine aggregating multiple providers.

### [SilverBullet](./silverbullet/README.md)

Browser-based markdown notes on a folder of plain files, including nested paths.

### [tldraw](./tldraw/README.md)

Multiplayer diagramming whiteboard — realtime collaboration, room-based scenes.

### [Wakapi](./wakapi/README.md)

Coding time tracking compatible with WakaTime.

### [WordCraft](./wordcraft/README.md)

Word processor in the browser: an open-source ArtCraft creative tool in
pure Rust, deployed as a static client-side WASM app.

## References

- **[Generic-App Chart](../../../../helm/generic-app/README.md)** - Application deployment template
