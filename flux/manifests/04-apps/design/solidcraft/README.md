# SolidCraft

[← Design Apps](../README.md)

## Links

- [Website](https://solidcraft.io)
- [GitHub](https://github.com/tangency-labs/solidcraft)
- [Docs](https://docs.solidcraft.io/)

## Overview

Open-source parametric 3D CAD in pure Rust. Sketch, constrain, and build solids on a parametric timeline. Runs in the browser via WebAssembly.

**URL:** <https://solidcraft.gateway.services.apocrathia.com>

## How it works

Static client-side WASM app. The prebuilt web release is downloaded by an init container and unpacked into a Longhorn PVC, then served by nginx. No backend, no database.

All designs live in the browser (IndexedDB/localStorage) - nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`SOLIDCRAFT_VERSION`) and tracked by Renovate via the `github-releases` datasource. A version bump redeploys the init container, which re-fetches and re-unpacks the release into the PVC.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n solidcraft

# Logs (init container download/unpack)
kubectl logs -n solidcraft -l app.kubernetes.io/name=solidcraft -c fetch-solidcraft

# Logs (nginx)
kubectl logs -n solidcraft -l app.kubernetes.io/name=solidcraft

# Describe
kubectl describe deployment -n solidcraft solidcraft
```
