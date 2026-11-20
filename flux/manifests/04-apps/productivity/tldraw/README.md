# tldraw

[← Productivity Apps](../README.md)

## Links

- [FoxxMD/tldraw-selfhosted](https://github.com/FoxxMD/tldraw-selfhosted)
- [tldraw](https://tldraw.dev)

## Overview

Multiplayer tldraw whiteboard — rooms at `/<room-name>`, realtime collaboration via tldraw sync, scenes and uploads persisted to disk.

**URL:** <https://tldraw.gateway.services.apocrathia.com>

## How it works

Built from source on every deploy: an init container clones [FoxxMD/tldraw-selfhosted](https://github.com/FoxxMD/tldraw-selfhosted) at a pinned commit, builds with the tldraw hobby license key (from the `tldraw-secrets` 1Password item, never in git), and copies the output plus production `node_modules/` to a PVC. The runtime container is stock `node:22-alpine` running the sync server on port 5858.

- `app` PVC: build output (rebuilt on each deploy)
- `config` PVC: rooms and uploaded assets (persists across deploys)
- Single replica — sync rooms are in-process state; horizontal scaling is not supported by the upstream design

## Updating

The source commit is pinned in `helmrelease.yaml` (`TLDRAW_COMMIT`). Bump it manually — the upstream repo has no releases for Renovate to track.

The license key lives in 1Password (`tldraw-secrets`, field `license-key`). tldraw hobby licenses are domain-locked; if the hostname ever changes, the key must be reissued.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n tldraw
kubectl logs -n tldraw -l app.kubernetes.io/name=tldraw -c build-tldraw
kubectl logs -n tldraw -l app.kubernetes.io/name=tldraw
```
