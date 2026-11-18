# Klecks

[← Design Apps](../README.md)

## Links

- [GitHub](https://github.com/bitbof/klecks)
- [Kleki](https://kleki.com)

## Overview

Web-based painting tool powering Kleki.com. Layers, brushes, filters — built at deploy time from source.

**URL:** <https://klecks.gateway.services.apocrathia.com>

## How it works

Built on every deploy: an init container clones the repo, runs `npm ci + npm run build`, and copies the output to a PVC. nginx serves the static `dist/` output.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n klecks
kubectl logs -n klecks -l app.kubernetes.io/name=klecks -c build-klecks
kubectl logs -n klecks -l app.kubernetes.io/name=klecks
```
