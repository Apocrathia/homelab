# DeckCraft

[← Productivity Apps](../README.md)

## Links

- [GitHub](https://github.com/storytold/deckcraft)
- [ArtCraft](https://getartcraft.com/apps/deckcraft)

## Overview

DeckCraft — open-source creative tool built in pure Rust by ArtCraft. Runs in the browser via WebAssembly.

**URL:** <https://deckcraft.gateway.services.apocrathia.com>

## How it works

Static client-side WASM app. The prebuilt web release is downloaded by an init container into a Longhorn PVC and served by nginx. No backend, no database.

All data lives in the browser (IndexedDB/localStorage). Nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`DECKCRAFT_VERSION`) and tracked by Renovate via the `github-releases` datasource.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n deckcraft
kubectl logs -n deckcraft -l app.kubernetes.io/name=deckcraft -c fetch-deckcraft
kubectl logs -n deckcraft -l app.kubernetes.io/name=deckcraft
kubectl describe deployment -n deckcraft deckcraft
```
