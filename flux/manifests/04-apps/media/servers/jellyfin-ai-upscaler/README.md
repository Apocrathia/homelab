# Jellyfin AI Upscaler

CPU ONNX upscaling service for the [Jellyfin AI Upscaler plugin](https://github.com/Kuschel-code/JellyfinUpscalerPlugin). The plugin is a thin HTTP client; this container does the inference.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

- Cluster-internal FastAPI service on port 5000 (`docker7-cpu` image)
- Model, cache, and auth-token state on Longhorn
- Shared-secret `API_TOKEN` via 1Password (`X-Api-Token`)
- No Gateway route — Jellyfin reaches it over cluster DNS

Realtime server-side upscaling is enabled. On CPU it will be slow; the plugin still sends frames.

## Access

- **Internal**: `http://jellyfin-ai-upscaler.jellyfin-ai-upscaler.svc.cluster.local:80`
- **Health**: `/health` (unauthenticated, used by probes)

There is no public URL. The operator dashboard on `:5000` is not exposed.

## Configuration

See `helmrelease.yaml` for env and storage. Model downloads happen at runtime into `/app/models`.

### Secrets

Create a 1Password item at `vaults/Secrets/items/jellyfin-ai-upscaler-secrets`:

| Field       | Purpose                                                                |
| ----------- | ---------------------------------------------------------------------- |
| `api-token` | Shared secret for env `API_TOKEN`. Same value as the plugin API token. |

### Jellyfin plugin

In **Dashboard → Plugins → AI Upscaler Plugin**:

1. **AI Service URL**: `http://jellyfin-ai-upscaler.jellyfin-ai-upscaler.svc.cluster.local:80`
2. **AI Service API Token**: same value as 1Password `api-token`
3. **Real-Time Upscaling**: on
4. **Realtime mode**: `server` (do not leave this on `auto` if you want CPU inference instead of WebGL fallback)

`localhost:5000` is the plugin default and will not work — that is inside the Jellyfin pod.

## Authentication

The service has no login. If `API_TOKEN` is set, mutating endpoints require `X-Api-Token`. `/health` stays public.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n jellyfin-ai-upscaler

# Logs
kubectl logs -n jellyfin-ai-upscaler deploy/jellyfin-ai-upscaler -f

# Health from inside the cluster
kubectl exec -n jellyfin-ai-upscaler deploy/jellyfin-ai-upscaler -- curl -sf http://127.0.0.1:5000/health
```

401 from the plugin means the token in Jellyfin does not match the 1Password field.

## References

- [Plugin repository](https://github.com/Kuschel-code/JellyfinUpscalerPlugin)
- [AI service README](https://github.com/Kuschel-code/JellyfinUpscalerPlugin/blob/main/docker-ai-service/README.md)
- [Docker image tags](https://github.com/Kuschel-code/JellyfinUpscalerPlugin/blob/main/docs/DOCKER-IMAGES.md)
