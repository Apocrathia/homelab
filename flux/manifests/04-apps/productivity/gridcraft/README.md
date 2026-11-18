# GridCraft

[← Productivity Apps](../README.md)

## Links

- [GitHub](https://github.com/storytold/gridcraft)
- [ArtCraft](https://getartcraft.com/apps/gridcraft)

## Overview

GridCraft — open-source creative tool built in pure Rust by ArtCraft. Runs in the browser via WebAssembly.

**URL:** <https://gridcraft.gateway.services.apocrathia.com>

## How it works

Static client-side WASM app. The prebuilt web release is downloaded by an init container into a Longhorn PVC and served by nginx. No backend, no database.

All data lives in the browser (IndexedDB/localStorage). Nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`GRIDCRAFT_VERSION`) and tracked by Renovate via the `github-releases` datasource.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n gridcraft
kubectl logs -n gridcraft -l app.kubernetes.io/name=gridcraft -c fetch-gridcraft
kubectl logs -n gridcraft -l app.kubernetes.io/name=gridcraft
kubectl describe deployment -n gridcraft gridcraft
```
