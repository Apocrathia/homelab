# DesignCraft

[← Design Apps](../README.md)

## Links

- [GitHub](https://github.com/storytold/designcraft)
- [ArtCraft](https://getartcraft.com/apps/designcraft)

## Overview

DesignCraft — open-source creative tool built in pure Rust by ArtCraft. Runs in the browser via WebAssembly.

**URL:** <https://designcraft.gateway.services.apocrathia.com>

## How it works

Static client-side WASM app. The prebuilt web release is downloaded by an init container into a Longhorn PVC and served by nginx. No backend, no database.

All data lives in the browser (IndexedDB/localStorage). Nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`DESIGNCRAFT_VERSION`) and tracked by Renovate via the `github-releases` datasource.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n designcraft
kubectl logs -n designcraft -l app.kubernetes.io/name=designcraft -c fetch-designcraft
kubectl logs -n designcraft -l app.kubernetes.io/name=designcraft
kubectl describe deployment -n designcraft designcraft
```
