# PhotoCraft

> **Navigation**: [← Design Apps](../README.md)

## Overview

PhotoCraft — open-source creative tool built in pure Rust by ArtCraft. Runs in the browser via WebAssembly.

**URL:** `https://photocraft.gateway.services.apocrathia.com`

## Configuration

Static client-side WASM app. The prebuilt web release is downloaded by an init container into a Longhorn PVC and served by nginx. No backend, no database.

All data lives in the browser (IndexedDB/localStorage). Nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`PHOTOCRAFT_VERSION`) and tracked by Renovate via the `github-releases` datasource.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n photocraft
kubectl logs -n photocraft -l app.kubernetes.io/name=photocraft -c fetch-photocraft
kubectl logs -n photocraft -l app.kubernetes.io/name=photocraft
kubectl describe deployment -n photocraft photocraft
```

## References

- **[GitHub](https://github.com/storytold/photocraft)** - Source code and issues
- **[ArtCraft](https://getartcraft.com/apps/photocraft)** - ArtCraft app listing
