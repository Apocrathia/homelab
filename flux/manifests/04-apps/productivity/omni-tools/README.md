# OmniTools

100+ client-side web tools: image, PDF, text, and data utilities that run entirely in the browser.

> **Navigation**: [← Back to Productivity README](../README.md)

## Overview

- Static React build served by nginx on port 80: image, PDF, text, and data
  converters, no backend involved
- All processing happens client-side, so files never leave the browser
- No secrets, no database, no persistence

## Access

- **External URL**: `https://omni-tools.gateway.services.apocrathia.com`
- **Tailnet**: same URL via split DNS — the door friends use
- **Internal Service**: `http://omni-tools.omni-tools.svc.cluster.local:80`

## Configuration

Nothing to configure. No environment variables, no config file — the image is
a static build of the app. Tool state lives in the browser and is not
persisted anywhere.

## Authentication

Handled through an Authentik proxy provider:

1. **Proxy Provider**: Authentik outpost fronts the app at the external URL
2. **Application**: Dashboard tile in the Productivity group
3. **Access**: admins group binding (order 10) plus users group binding
   (order 20) for the friends tier

The outpost's HTTPRoute attaches to both `main-gateway` and `tailnet-gateway`;
tailnet split DNS resolves the same hostname to the tailnet door.

## Troubleshooting

```bash
# Pod status and logs
kubectl -n omni-tools get pods
kubectl -n omni-tools logs deployment/omni-tools

# Curl the in-cluster service
kubectl -n omni-tools run curl --rm -it --image=curlimages/curl -- \
  curl -s http://omni-tools.omni-tools.svc.cluster.local -o /dev/null
```

## References

- **[OmniTools GitHub](https://github.com/iib0011/omni-tools)** - Source code and releases
- **[omnitools.app](https://omnitools.app)** - Hosted demo instance
