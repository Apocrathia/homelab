# Moonlight Web

Browser Moonlight client that streams Sunshine hosts into a web browser. No
native desktop client required.

> **Navigation**: [← Back to Games README](../README.md)

## Overview

- Unofficial web Moonlight client (`moonlight-web-stream`)
- Authentik proxy SSO with trusted-header user mapping
- Longhorn volume for `config.json` / `data.json` (users, hosts, pairings)
- No LoadBalancer — stream over WebSocket through the Authentik HTTPS path

## Access

- **URL**: `https://moonlight.gateway.services.apocrathia.com`

## Configuration

Server knobs that matter here are env vars in `helmrelease.yaml`
(`BIND_ADDRESS`, `FORWARDED_HEADER`). Hosts and pairing live in the web UI and
persist on the Longhorn volume — they are not ConfigMap/env seedable.

### Streaming

This deployment does not publish WebRTC UDP ports. In the UI, set **Data
Transport** to **Web Sockets** (or leave Auto and let it fall back). WebRTC
needs a Cilium LoadBalancer + `WEBRTC_NAT_1TO1_HOST`; that is intentionally
out of scope for now.

Sunshine hosts must be reachable from the cluster (LAN route / DNS).

## Authentication

Authentik proxy. The app reads `X-authentik-username` and auto-creates users on
first login (`FORWARDED_HEADER`). First Authentik user through the door becomes
admin for in-app roles.

## Initial setup

1. Open the URL and sign in via Authentik.
2. On each Sunshine host, require stream encryption (Sunshine `sunshine.conf`):

   ```ini
   lan_encryption_mode = 2
   wan_encryption_mode = 2
   ```

   Moonlight Web negotiates encryption with the host; leaving these off on a
   reachable LAN/WAN path is a bad idea.

3. Add a PC with the Sunshine host address (leave port empty for defaults).
4. Pair with the PIN shown in Sunshine.
5. Set Data Transport to Web Sockets before launching an app.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n moonlight-web

# Application logs
kubectl logs deployment/moonlight-web -n moonlight-web -f

# Check Authentik outpost
kubectl get pods -n authentik | grep moonlight
```

If streams fail to start, confirm transport is WebSocket and that the Sunshine
host answers from inside the cluster (`kubectl exec` + curl/ping).

## References

- **[Moonlight Web README](https://github.com/MrCreativ3001/moonlight-web-stream)** - Upstream docs
- **[Sunshine](https://docs.lizardbyte.dev/projects/sunshine/)** - Host streaming server
