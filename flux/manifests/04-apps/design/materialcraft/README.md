# MaterialCraft

[← Design Apps](../README.md)

## Links

- [GitHub](https://github.com/storytold/materialcraft)
- [ArtCraft](https://getartcraft.com/apps/materialcraft)

## Overview

MaterialCraft — open-source creative tool built in pure Rust by ArtCraft. Runs in the browser via WebAssembly.

**URL:** <https://materialcraft.gateway.services.apocrathia.com>

## How it works

Static client-side WASM app. The prebuilt web release is downloaded by an init container into a Longhorn PVC and served by nginx. No backend, no database.

All data lives in the browser (IndexedDB/localStorage). Nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`MATERIALCRAFT_VERSION`) and tracked by Renovate via the `github-releases` datasource.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n materialcraft
kubectl logs -n materialcraft -l app.kubernetes.io/name=materialcraft -c fetch-materialcraft
kubectl logs -n materialcraft -l app.kubernetes.io/name=materialcraft
kubectl describe deployment -n materialcraft materialcraft
```
