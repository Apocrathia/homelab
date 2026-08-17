# LiteLLM

Unified interface for 100+ LLMs with OpenAI proxy compatibility, allowing seamless integration with various AI models through a single API.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Overview

This deployment includes:

- Universal LLM proxy supporting 100+ providers with OpenAI-compatible API
- PostgreSQL database for model configurations and usage tracking
- Valkey for exact response caching (Redis protocol; `REDIS_HOST=litellm-valkey`)
- Master key-based API access control

## Configuration

### 1Password Secrets

Create a 1Password item:

#### litellm-secrets (`vaults/Secrets/items/litellm-secrets`)

- `master-key`: Master key for API access control
- `username`: Database and UI username (shared)
- `password`: Database and UI password (shared)
- `model-config`: YAML array containing the model_list configuration
- `ollama-api-base`: Ollama API base URL for local LLM integration
- `prime-api-key`: Prime Inference API key for cloud model routes
- `prime-team-id`: Prime team ID for `X-Prime-Team-ID` billing header
- `redis-password`: Shared password for Valkey (`litellm-valkey`) and LiteLLM `REDIS_PASSWORD`
- `oidc-client-id`: Authentik OIDC provider Client ID (from provider after blueprint apply)
- `oidc-client-secret`: Authentik OIDC provider Client Secret
- `hermes-a2a-authorization`: Full `Bearer <token>` Authorization header value for Hermes Agent inbound A2A (same token as `hermes-agent-secrets`/`a2a-bearer-token`)

### Storage

- **Database Storage**: CloudNativePG PostgreSQL cluster for model configurations
- **Cache**: Valkey (`litellm-valkey`) — in-memory only, no PVC; LRU eviction
- **Configuration Volume**: Model configuration mounted from ConfigMap (`litellm.yml`)

### Access

- **External URL**: `https://ai.gateway.services.apocrathia.com`
- **Internal Service**: `http://litellm.litellm.svc.cluster.local:4000`

## Authentication

Admin UI uses native LiteLLM SSO (OIDC) with Authentik as the IdP. Traffic is routed directly to LiteLLM via HTTPRoute; no Authentik proxy. API access uses the master key. Username/password remain for fallback login at `/fallback/login`. After applying the blueprint, copy the OIDC provider Client ID and Client Secret from Authentik into the 1Password item.

## Security Considerations

- **API Key Management**: All model API keys stored securely in 1Password
- **Master Key Access**: Single master key controls API access
- **Database Security**: PostgreSQL credentials managed through 1Password
- **Network Policies**: Cilium NetworkPolicy for traffic control
- **Prompt secret masking**: two `pre_call` / `default_on` guardrails in
  `litellm.yml`. `secret-mask` (`litellm_content_filter`) redacts
  credential-shaped strings. `hide-secrets` runs detect-secrets
  keyword/format detectors on the same traffic.

## Troubleshooting

### Common Issues

1. **Database Connection Issues**

```bash
 # Check PostgreSQL cluster status
 kubectl -n litellm get cluster litellm-postgres

 # Verify database connectivity
 kubectl -n litellm exec -it litellm-postgres-1 -- psql -U litellm -d litellm -c "SELECT version();"
```

2. **Model Configuration Issues**

```bash
 # Check model config secret
 kubectl -n litellm get secret litellm-secrets -o yaml

 # View LiteLLM logs
 kubectl -n litellm logs -l app.kubernetes.io/name=litellm
```

### Health Checks

```bash
# Overall status
kubectl -n litellm get pods,svc,pvc

# LiteLLM application status
kubectl -n litellm get pods -l app.kubernetes.io/name=litellm

# PostgreSQL cluster status
kubectl get cluster litellm-postgres -n litellm -o wide

# Valkey cache
kubectl get pods,svc -n litellm -l app=litellm-valkey
```

## References

- **[LiteLLM Official Documentation](https://docs.litellm.ai)** - Primary documentation source
- **[LiteLLM Admin UI SSO](https://docs.litellm.ai/docs/proxy/admin_ui_sso)** - SSO setup (Generic OIDC)
- **[LiteLLM GitHub Repository](https://github.com/BerriAI/litellm)** - Source code and issues
- **[MLflow Integration](https://docs.litellm.ai/docs/observability/mlflow)** - Observability setup
