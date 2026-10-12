# PRISM

Self-hosted OSINT scanner: domain, IP, email, phone, and username reconnaissance across 26 modules, with OPSEC scoring, an entity graph, and HTML/PDF/CSV report exports.

> **Navigation**: [← Back to Security README](../README.md)

## Overview

This deployment includes:

- Single FastAPI container (uvicorn) serving the static UI, `/api`, WebSocket progress streams, and `/healthz` on one port
- No database - scan history, watchlists, and reports persist as JSON and PDF files on Longhorn volumes
- Module cache on an emptyDir (rebuildable TTL cache, dies with the pod)
- Authentik proxy SSO in front; no HTTPRoute (the outpost owns routing)

## Access

- **URL**: `https://prism.gateway.services.apocrathia.com`

## Configuration

PRISM is env-first: every setting is an environment variable, and there is no web bootstrap or config file. The deployment sets the auth-related variables only:

- `ALLOW_ANON_API` - locked off; every API call needs a key
- `API_KEYS` / `PRISM_UI_API_KEY` - the API key and its browser-visible copy (the backend injects it into the UI at page load; both read the same vault value)
- `TRUST_PROXY_HEADERS` - honor `X-Forwarded-*` from the authentik outpost

`TRUSTED_HOSTS` stays unset on purpose: kubelet probes hit the pod IP in the Host header, and the app's trusted-host middleware would reject them.

Scan modules run keyless by default (16 of 26). Optional provider keys (Shodan, VirusTotal, HIBP, and friends) are env-first too; add them to the deployment if a module needs one. See `helmrelease.yaml` for the complete deployment configuration.

### Secrets

1Password item `vaults/Secrets/items/prism-secrets` provides:

- `api-key` - the PRISM API key, bound to both `API_KEYS` and `PRISM_UI_API_KEY`
- `llm-api-key` - LiteLLM virtual key for the AI summary/chat, bound to `LLM_API_KEY`

The UI key is browser-visible by design - the backend injects it into the UI runtime config so the frontend can authenticate API calls. Anyone with lab access can read it; the Authentik gate is the real boundary.

## Authentication

Authentik SSO (proxy provider) gates the whole app at the network layer. Behind it, the API requires the key on every call; anonymous API access is disabled.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n prism

# Application logs
kubectl logs -n prism deploy/prism -f

# Health check
kubectl run -it --rm curl --image=curlimages/curl -n prism -- \
  curl -s http://prism.prism.svc.cluster.local:8080/healthz

# Check the authentik outpost
kubectl get pods -n authentik | grep prism
```

## References

- [NovaCode37/Prism-platform](https://github.com/NovaCode37/Prism-platform) - source, module matrix, issues
- [Configuration guide](https://github.com/NovaCode37/Prism-platform/blob/main/docs/CONFIGURATION.md) - env var reference and reverse proxy notes
