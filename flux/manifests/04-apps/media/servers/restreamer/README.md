# Restreamer

Self-hosted video streaming server that ingests sources (IP cameras, RTSP, HLS, RTMP), restreams them, and publishes to websites or external services like YouTube and Twitch.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Restreamer web UI for stream configuration
- FFmpeg-based encoding and restreaming (CPU only)
- HLS playback through the Authentik-protected gateway
- Longhorn persistent storage for config and data

## Access

- **URL**: `https://restreamer.gateway.services.apocrathia.com`

## Configuration

All stream configuration is done through the web UI. The application generates its own `config.json` on first run; no environment secrets are required for startup.

See `helmrelease.yaml` for complete deployment configuration.

## Authentication

Authentication is handled through the Authentik proxy provider:

1. External requests pass through the Authentik outpost before reaching Restreamer
2. On first login, the Restreamer setup dialog assigns local admin credentials
3. Both layers are required: Authentik SSO, then the local Restreamer login

The open-source version has no OIDC/SSO support (Auth0 only), so proxy mode fronts the app's local authentication.

## Initial Setup

1. Open the URL above and authenticate through Authentik
2. The first-login dialog asks for an admin username and password
3. Use the wizard to connect a video source and publish it

## Limitations

- **CPU encoding only**: software FFmpeg (x264). The `vaapi`/`cuda` image variants and device mounts are not wired up.
- **No RTMP/SRT ingest**: ports 1935/6000 are not exposed. Pull-based sources (RTSP/HLS URLs) and push-based outputs (RTMP to YouTube etc.) work; receiving an inbound RTMP/SRT stream requires a TCP route or LoadBalancer, which the generic-app chart supports via `tcproute`/`udproute`/`loadbalancer` if needed later.
- **Telemetry disabled**: `CORE_UPDATE_CHECK=false` stops the anonymous version report to `service.datarhei.com`; `CORE_HOST_NAME` is pinned so the app never probes `api.ipify.org` for its public IP.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n restreamer

# Application logs
kubectl logs -n restreamer deployment/restreamer -f

# Health endpoint (in-cluster)
kubectl run -it --rm curl --image=curlimages/curl -- curl -s http://restreamer.restreamer.svc:80/ping

# Check Authentik outpost
kubectl get pods -n authentik | grep restreamer
```

## References

- **[Restreamer Documentation](https://docs.datarhei.com/restreamer)** - Official documentation
- **[Restreamer GitHub](https://github.com/datarhei/restreamer)** - Source code and issues
- **[Environment Variables](https://docs.datarhei.com/restreamer/api/environment-variables)** - Core configuration reference
