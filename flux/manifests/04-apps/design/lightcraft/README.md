# LightCraft

[← Design Apps](../README.md)

## Links

- [GitHub](https://github.com/storytold/lightcraft)
- [ArtCraft](https://getartcraft.com/apps/lightcraft)

## Overview

LightCraft — open-source creative tool built in pure Rust by ArtCraft. Runs in the browser via WebAssembly.

**URL:** <https://lightcraft.gateway.services.apocrathia.com>

## How it works

Static client-side WASM app. The prebuilt web release is downloaded by an init container into a Longhorn PVC and served by nginx. No backend, no database.

All data lives in the browser (IndexedDB/localStorage). Nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`LIGHTCRAFT_VERSION`) and tracked by Renovate via the `github-releases` datasource.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n lightcraft
kubectl logs -n lightcraft -l app.kubernetes.io/name=lightcraft -c fetch-lightcraft
kubectl logs -n lightcraft -l app.kubernetes.io/name=lightcraft
kubectl describe deployment -n lightcraft lightcraft
```
