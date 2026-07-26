# OpenWebUI

Chat UI for quick inference against LiteLLM.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Overview

- OpenWebUI web interface
- Authentik trusted-header SSO
- Longhorn persistent storage
- LiteLLM as the sole OpenAI-compatible backend

## Access

- **External URL**: `https://chat.gateway.services.apocrathia.com`
- **Internal Service**: `http://openwebui.openwebui.svc.cluster.local:8080`
- **LiteLLM**: `http://litellm.litellm.svc.cluster.local:4000`

`WEBUI_URL` is set to the external URL for OAuth/SSO redirects. API base URL and
key come from `OPENAI_API_BASE_URLS` / `OPENAI_API_KEYS` (key in
`openwebui-secrets`).

## Authentication

1. User hits `https://chat.gateway.services.apocrathia.com`
2. Authentik outpost authenticates and injects trusted headers
3. OpenWebUI creates/authenticates the user from those headers

Trusted header names are configured in the HelmRelease `sso.trustedHeader`
section; Authentik sends them via the proxy provider blueprint.

## Security

- SSO through Authentik proxy outpost
- OpenWebUI requires root (`runAsNonRoot: false`); chart upstream documents
  non-root as untested
- Read-only root filesystem disabled for the same reason

## Troubleshooting

```bash
# Status
kubectl get pods,svc,pvc -n openwebui

# App logs
kubectl logs -l app.kubernetes.io/name=openwebui -n openwebui

# Authentik outpost
kubectl get pods -l app.kubernetes.io/name=authentik-outpost -n authentik
```

## References

- [OpenWebUI docs](https://docs.openwebui.com)
- [OpenWebUI Helm chart](https://github.com/open-webui/helm-charts)
- [SSO guide](https://docs.openwebui.com/features/sso)
