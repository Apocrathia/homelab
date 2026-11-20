# EffectCraft

> **Navigation**: [← Design Apps](../README.md)

## Overview

EffectCraft, open-source creative tool built in pure Rust by ArtCraft. Runs in the browser via WebAssembly.

**URL:** `https://effectcraft.gateway.services.apocrathia.com`

## Configuration

Static client-side WASM app. The prebuilt web release is downloaded by an init container into a Longhorn PVC and served by nginx. No backend, no database.

All data lives in the browser (IndexedDB/localStorage). Nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`EFFECTCRAFT_VERSION`) and tracked by Renovate via the `github-releases` datasource.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n effectcraft
kubectl logs -n effectcraft -l app.kubernetes.io/name=effectcraft -c fetch-effectcraft
kubectl logs -n effectcraft -l app.kubernetes.io/name=effectcraft
kubectl describe deployment -n effectcraft effectcraft
```

## References

- **[GitHub](https://github.com/storytold/effectcraft)** - Source code and issues
- **[ArtCraft](https://getartcraft.com/apps/effectcraft)** - ArtCraft app listing
