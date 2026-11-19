# BenchUp3D

> **Navigation**: [← Design Apps](../README.md)

## Overview

Open-source SketchUp-style 3D modeler for woodworking. Import .skp files, push/pull modeling, in the browser via WebAssembly.

**URL:** `https://benchup.gateway.services.apocrathia.com`

## Configuration

Deployed via the generic-app Helm chart — see `helmrelease.yaml` for complete
deployment configuration.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n benchup
kubectl logs -n benchup -l app.kubernetes.io/name=benchup -c fetch-benchup
```

## References

- **[GitHub](https://github.com/BenchUp3D/benchup)** - Source code and issues
- **[Demo](https://benchup3d.github.io)** - Live demo
