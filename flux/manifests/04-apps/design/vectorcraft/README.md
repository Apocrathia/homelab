# VectorCraft

> **Navigation**: [← Design Apps](../README.md)

## Overview

VectorCraft, open-source creative tool built in pure Rust by ArtCraft. Runs in the browser via WebAssembly.

**URL:** `https://vectorcraft.gateway.services.apocrathia.com`

## Configuration

Static client-side WASM app. The prebuilt web release is downloaded by an init container into a Longhorn PVC and served by nginx. No backend, no database.

All data lives in the browser (IndexedDB/localStorage). Nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`VECTORCRAFT_VERSION`) and tracked by Renovate via the `github-releases` datasource.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n vectorcraft
kubectl logs -n vectorcraft -l app.kubernetes.io/name=vectorcraft -c fetch-vectorcraft
kubectl logs -n vectorcraft -l app.kubernetes.io/name=vectorcraft
kubectl describe deployment -n vectorcraft vectorcraft
```

## References

- **[GitHub](https://github.com/storytold/vectorcraft)** - Source code and issues
- **[ArtCraft](https://getartcraft.com/apps/vectorcraft)** - ArtCraft app listing
