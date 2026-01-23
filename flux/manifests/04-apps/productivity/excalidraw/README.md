# Excalidraw

[← Productivity Apps](../README.md)

## Links

- [Website](https://excalidraw.com/)
- [GitHub](https://github.com/excalidraw/excalidraw)
- [Docs](https://docs.excalidraw.com/)

## Overview

Open-source whiteboard with a hand-drawn aesthetic. Infinite canvas, shape libraries, dark mode, exports to PNG/SVG.

**URL:** <https://excalidraw.gateway.services.apocrathia.com>

## How it works

This is a self-hosted instance of the web client. All data lives in your browser (IndexedDB) - nothing persists server-side.

The self-hosted version doesn't include real-time collaboration. For that, use excalidraw.com.

## Authentication

Authentik proxy.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n excalidraw

# Logs
kubectl logs -n excalidraw -l app.kubernetes.io/name=excalidraw

# Describe
kubectl describe deployment -n excalidraw excalidraw
```
