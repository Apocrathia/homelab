# FilmCraft

[← Design Apps](../README.md)

## Links

- [GitHub](https://github.com/storytold/filmcraft)
- [ArtCraft](https://getartcraft.com/apps/filmcraft)

## Overview

FilmCraft — open-source creative tool built in pure Rust by ArtCraft. Runs in the browser via WebAssembly.

**URL:** <https://filmcraft.gateway.services.apocrathia.com>

## How it works

Static client-side WASM app. The prebuilt web release is downloaded by an init container into a Longhorn PVC and served by nginx. No backend, no database.

All data lives in the browser (IndexedDB/localStorage). Nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`FILMCRAFT_VERSION`) and tracked by Renovate via the `github-releases` datasource.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n filmcraft
kubectl logs -n filmcraft -l app.kubernetes.io/name=filmcraft -c fetch-filmcraft
kubectl logs -n filmcraft -l app.kubernetes.io/name=filmcraft
kubectl describe deployment -n filmcraft filmcraft
```
