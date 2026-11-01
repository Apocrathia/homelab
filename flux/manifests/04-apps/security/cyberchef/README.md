# CyberChef

GCHQ's browser-based "cyber Swiss Army knife": encode, decode, hash, parse,
and analyse data without it leaving the tab.

> **Navigation**: [← Back to Security README](../README.md)

## Overview

- Client-side-only tool: every operation runs in the browser, the server
  just ships a static build
- No backend, no database, no secrets, nothing persisted
- nginx-unprivileged serves the build on 8080
- Authentik proxy authentication (admins + friends tier)

## Access

- **External URL**: `https://cyberchef.gateway.services.apocrathia.com`
- **Tailnet**: same URL via split DNS — the door friends use
- **Internal Service**: `http://cyberchef.cyberchef.svc.cluster.local:8080`

## Configuration

Nothing to configure: no environment variables, no config file, no
first-run wizard. Recipes and their inputs are encoded in the URL hash, so
a saved operation is a shareable link; that state stays client-side and is
never sent to or stored on the server.

## Authentication

Handled through an Authentik proxy provider:

1. **Proxy Provider**: Authentik outpost fronts the app at the external URL
2. **Application**: Dashboard tile in the Security group
3. **Access**: admins group binding (order 10) plus users group binding
   (order 20) for the friends tier

## Troubleshooting

```bash
# Pod status and logs
kubectl -n cyberchef get pods
kubectl -n cyberchef logs deployment/cyberchef

# Confirm the SPA is served from inside the cluster (expect 200)
kubectl -n cyberchef run curl --rm -it --image=curlimages/curl -- \
  curl -s http://cyberchef.cyberchef.svc.cluster.local:8080 -o /dev/null -w "%{http_code}\n"
```

## References

- **[CyberChef GitHub](https://github.com/gchq/CyberChef)** - Source code and releases
- **[Official instance](https://gchq.github.io/CyberChef/)** - GCHQ's hosted copy
