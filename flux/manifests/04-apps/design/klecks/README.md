# Klecks

> **Navigation**: [← Design Apps](../README.md)

## Overview

Web-based painting tool powering Kleki.com. Layers, brushes, filters — built at deploy time from source.

**URL:** `https://klecks.gateway.services.apocrathia.com`

## Configuration

Built on every deploy: an init container clones the repo, runs `npm ci + npm run build`, and copies the output to a PVC. nginx serves the static `dist/` output.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n klecks
kubectl logs -n klecks -l app.kubernetes.io/name=klecks -c build-klecks
kubectl logs -n klecks -l app.kubernetes.io/name=klecks
```

## References

- **[GitHub](https://github.com/bitbof/klecks)** - Source code and issues
- **[Kleki](https://kleki.com)** - Project website
