# Craft Anything

> **Navigation**: [← Design Apps](../README.md)

## Overview

Craft Anything — open-source creative tool built in pure Rust by ArtCraft. Runs in the browser via WebAssembly.

**URL:** `https://craft-anything.gateway.services.apocrathia.com`

## Configuration

Static client-side WASM app. The prebuilt web release is downloaded by an init container into a Longhorn PVC and served by nginx. No backend, no database.

All data lives in the browser (IndexedDB/localStorage). Nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`CRAFT_ANYTHING_VERSION`) and tracked by Renovate via the `github-releases` datasource.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n craft-anything
kubectl logs -n craft-anything -l app.kubernetes.io/name=craft-anything -c fetch-craft-anything
kubectl logs -n craft-anything -l app.kubernetes.io/name=craft-anything
kubectl describe deployment -n craft-anything craft-anything
```

## References

- **[GitHub](https://github.com/storytold/craft-anything)** - Source code and issues
- **[ArtCraft](https://getartcraft.com/apps/craft-anything)** - ArtCraft app listing
