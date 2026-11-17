# Webamp

[← Media Apps](../README.md)

## Links

- [GitHub](https://github.com/captbaritone/webamp)
- [Website](https://webamp.org)

## Overview

Winamp 2.9 reimplemented in the browser. Skins, visualizer, equalizer, playlist — all in HTML/JS.

**URL:** <https://webamp.gateway.services.apocrathia.com>

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n webamp
kubectl logs -n webamp -l app.kubernetes.io/name=webamp -c fetch-webamp
```
