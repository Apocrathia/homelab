# LibreSpeed

Self-hosted HTML5 network speed test for measuring LAN, tailnet, and WAN throughput.

> **Navigation**: [← Back to Management README](../README.md)

## Overview

- LibreSpeed standalone mode: web UI and test backend in one container
- No telemetry, no database, no persistent storage
- Authentik proxy authentication (admins + friends tier)
- Apache/PHP serves the frontend and generates the test traffic

## Access

- **External URL**: `https://speedtest.gateway.services.apocrathia.com`
- **Tailnet**: same URL via split DNS — the door friends use
- **Internal Service**: `http://speedtest.speedtest.svc.cluster.local:80`

## Configuration

The container needs no secrets. `TZ` and `USE_NEW_DESIGN=true` are the only
environment variables; `MODE=standalone` and `TELEMETRY=false` are baked in.
`USE_NEW_DESIGN` makes the entrypoint rewrite `config.json` so the modern
frontend loads by default (`?design=old` still forces the classic one).
Without an `IPINFO_APIKEY`, ISP lookups use the bundled offline database and
make no external calls.

The image's entrypoint runs as root (chowns the webroot, edits Apache config)
and then drops to www-data workers, so the pod uses a privileged security
context with a minimal capability set.

## Authentication

Handled through an Authentik proxy provider:

1. **Proxy Provider**: Authentik outpost fronts the app at the external URL
2. **Application**: Dashboard tile in the Productivity group
3. **Access**: admins group binding (order 10) plus users group binding
   (order 20) for the friends tier

The outpost's HTTPRoute attaches to both `main-gateway` and `tailnet-gateway`;
tailnet split DNS resolves the same hostname to the tailnet door. Friends test
their Tailscale bandwidth to the cluster with this app.

## Troubleshooting

```bash
# Pod status and logs
kubectl -n speedtest get pods
kubectl -n speedtest logs deployment/speedtest

# The entrypoint prints its env and "Done, Starting APACHE" before serving
# if the pod restarts before that line, check the entrypoint output above it

# Test the speed test backend from inside the cluster
kubectl -n speedtest run curl --rm -it --image=curlimages/curl -- \
  curl -s http://speedtest.speedtest.svc.cluster.local/backend/garbage.php -o /dev/null
```

## References

- **[LibreSpeed GitHub](https://github.com/librespeed/speedtest)** - Source code and releases
- **[Docker documentation](https://github.com/librespeed/speedtest/blob/master/doc_docker.md)** - Modes and environment variables
