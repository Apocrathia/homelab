# LiteLLM

Unified interface for 100+ LLMs with OpenAI proxy compatibility, allowing seamless integration with various AI models through a single API.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Documentation

- **[LiteLLM Official Documentation](https://docs.litellm.ai)** - Primary documentation source
- **[LiteLLM GitHub Repository](https://github.com/BerriAI/litellm)** - Source code and issues
- **[MLflow Integration](https://docs.litellm.ai/docs/observability/mlflow)** - Observability setup

## Overview

This deployment includes:

- Universal LLM proxy supporting 100+ providers with OpenAI-compatible API
- PostgreSQL database for model configurations and usage tracking
- MLflow integration for experiment tracking and observability
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

### Storage

- **Database Storage**: CloudNativePG PostgreSQL cluster for model configurations
- **Configuration Volume**: Model configuration mounted from 1Password secret

### Access

- **External URL**: `https://litellm.gateway.services.apocrathia.com`
- **Internal Service**: `http://litellm.litellm.svc.cluster.local:4000`

## Authentication

Access to the LiteLLM proxy requires a master key configured through the secret management system. Individual model API keys are stored securely via 1Password.

## Security Considerations

- **API Key Management**: All model API keys stored securely in 1Password
- **Master Key Access**: Single master key controls API access
- **Database Security**: PostgreSQL credentials managed through 1Password
- **Network Policies**: Cilium NetworkPolicy for traffic control

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
kubectl -n litellm get cluster litellm-postgres -o wide
```
