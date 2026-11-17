# WordCraft

[← Productivity Apps](../README.md)

## Links

- [GitHub](https://github.com/storytold/wordcraft)
- [ArtCraft](https://getartcraft.com/apps/wordcraft)

## Overview

WordCraft — open-source creative tool built in pure Rust by ArtCraft. Runs in the browser via WebAssembly.

**URL:** <https://wordcraft.gateway.services.apocrathia.com>

## How it works

Static client-side WASM app. The prebuilt web release is downloaded by an init container into a Longhorn PVC and served by nginx. No backend, no database.

All data lives in the browser (IndexedDB/localStorage). Nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`WORDCRAFT_VERSION`) and tracked by Renovate via the `github-releases` datasource.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n wordcraft
kubectl logs -n wordcraft -l app.kubernetes.io/name=wordcraft -c fetch-wordcraft
kubectl logs -n wordcraft -l app.kubernetes.io/name=wordcraft
kubectl describe deployment -n wordcraft wordcraft
```
