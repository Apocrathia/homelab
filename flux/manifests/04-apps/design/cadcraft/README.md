# CADCraft

[← Design Apps](../README.md)

## Links

- [GitHub](https://github.com/storytold/cadcraft)
- [ArtCraft](https://getartcraft.com/apps/cadcraft)

## Overview

CADCraft — open-source creative tool built in pure Rust by ArtCraft. Runs in the browser via WebAssembly.

**URL:** <https://cadcraft.gateway.services.apocrathia.com>

## How it works

Static client-side WASM app. The prebuilt web release is downloaded by an init container into a Longhorn PVC and served by nginx. No backend, no database.

All data lives in the browser (IndexedDB/localStorage). Nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`CADCRAFT_VERSION`) and tracked by Renovate via the `github-releases` datasource.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n cadcraft
kubectl logs -n cadcraft -l app.kubernetes.io/name=cadcraft -c fetch-cadcraft
kubectl logs -n cadcraft -l app.kubernetes.io/name=cadcraft
kubectl describe deployment -n cadcraft cadcraft
```
