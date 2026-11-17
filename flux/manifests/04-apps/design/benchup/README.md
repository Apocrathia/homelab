# BenchUp3D

[← Design Apps](../README.md)

## Links

- [GitHub](https://github.com/BenchUp3D/benchup)
- [Demo](https://benchup3d.github.io)

## Overview

Open-source SketchUp-style 3D modeler for woodworking. Import .skp files, push/pull modeling, in the browser via WebAssembly.

**URL:** <https://benchup.gateway.services.apocrathia.com>

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n benchup
kubectl logs -n benchup -l app.kubernetes.io/name=benchup -c fetch-benchup
```
