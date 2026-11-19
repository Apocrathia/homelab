# PdfCraft

> **Navigation**: [← Design Apps](../README.md)

## Overview

PdfCraft — open-source creative tool built in pure Rust by ArtCraft. Runs in the browser via WebAssembly.

**URL:** `https://pdfcraft.gateway.services.apocrathia.com`

## Configuration

Static client-side WASM app. The prebuilt web release is downloaded by an init container into a Longhorn PVC and served by nginx. No backend, no database.

All data lives in the browser (IndexedDB/localStorage). Nothing persists server-side.

## Updating

The web release version is pinned in `helmrelease.yaml` (`PDFCRAFT_VERSION`) and tracked by Renovate via the `github-releases` datasource.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n pdfcraft
kubectl logs -n pdfcraft -l app.kubernetes.io/name=pdfcraft -c fetch-pdfcraft
kubectl logs -n pdfcraft -l app.kubernetes.io/name=pdfcraft
kubectl describe deployment -n pdfcraft pdfcraft
```

## References

- **[GitHub](https://github.com/storytold/pdfcraft)** - Source code and issues
- **[ArtCraft](https://getartcraft.com/apps/pdfcraft)** - ArtCraft app listing
