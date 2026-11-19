# SoundCraft

> **Navigation**: [← Design Apps](../README.md)

## Overview

SoundCraft — open-source creative tool built in pure Rust by ArtCraft. Runs in the browser via WebAssembly.

**URL:** `https://soundcraft.gateway.services.apocrathia.com`

## Configuration

Static client-side WASM app. The prebuilt web release is downloaded by an init container into a Longhorn PVC and served by nginx. No backend, no database.

All data lives in the browser (IndexedDB/localStorage). Nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`SOUNDCRAFT_VERSION`) and tracked by Renovate via the `github-releases` datasource.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n soundcraft
kubectl logs -n soundcraft -l app.kubernetes.io/name=soundcraft -c fetch-soundcraft
kubectl logs -n soundcraft -l app.kubernetes.io/name=soundcraft
kubectl describe deployment -n soundcraft soundcraft
```

## References

- **[GitHub](https://github.com/storytold/soundcraft)** - Source code and issues
- **[ArtCraft](https://getartcraft.com/apps/soundcraft)** - ArtCraft app listing
