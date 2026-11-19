# TextureCraft

> **Navigation**: [← Design Apps](../README.md)

## Overview

TextureCraft — open-source creative tool built in pure Rust by ArtCraft. Runs in the browser via WebAssembly.

**URL:** `https://texturecraft.gateway.services.apocrathia.com`

## Configuration

Static client-side WASM app. The prebuilt web release is downloaded by an init container into a Longhorn PVC and served by nginx. No backend, no database.

All data lives in the browser (IndexedDB/localStorage). Nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`TEXTURECRAFT_VERSION`) and tracked by Renovate via the `github-releases` datasource.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n texturecraft
kubectl logs -n texturecraft -l app.kubernetes.io/name=texturecraft -c fetch-texturecraft
kubectl logs -n texturecraft -l app.kubernetes.io/name=texturecraft
kubectl describe deployment -n texturecraft texturecraft
```

## References

- **[GitHub](https://github.com/storytold/texturecraft)** - Source code and issues
- **[ArtCraft](https://getartcraft.com/apps/texturecraft)** - ArtCraft app listing
