# Guardrails AI

API server providing guardrails validation for LLM outputs using community validators from the Guardrails Hub. Designed to integrate with LiteLLM as a guardrails provider.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Documentation

- **[Guardrails Hub](https://www.guardrailsai.com/docs/concepts/hub)** - Community validators
- **[Guardrails Lite Server](https://github.com/guardrails-ai/guardrails-lite-server)** - Reference implementation
- **[LiteLLM Guardrails](https://docs.litellm.ai/docs/guardrails/guardrails_ai)** - Integration documentation

## Overview

This deployment includes:

- Lightweight validation server for LLM output validation
- Community validators from Guardrails Hub
- API-only service for LiteLLM integration
- Production-ready validation for secrets, toxicity, and content quality

## Configuration

### Hub Validators Included

- **secrets-guard**: Prevents API keys, passwords, and sensitive data leakage
- **toxic-guard**: Blocks toxic, offensive, or harmful language
- **gibberish-guard**: Detects and prevents nonsensical or gibberish text using AI models
- **name-case**: Example validator for Title Case format (e.g., "John Smith")

### Access

- **Internal API**: `http://guardrails.guardrails-ai.svc.cluster.local:8000`
- **Purpose**: Cluster-internal service for LiteLLM integration

## Authentication

Internal API only - no external authentication required. Access controlled through cluster network policies.

## Security Considerations

- **Internal Only**: Service only accessible within cluster
- **Network Policies**: Cilium NetworkPolicy restricts access
- **Validation Focus**: Designed to prevent sensitive data leakage

## Troubleshooting

### Common Issues

1. **Service Connectivity**

   ```bash
   # Check service status
   kubectl -n guardrails-ai get pods,svc

   # Test internal connectivity
   kubectl -n guardrails-ai exec -it deployment/guardrails -- curl localhost:8000/guards
   ```

2. **LiteLLM Integration Issues**

   ```bash
   # Check LiteLLM configuration
   kubectl -n litellm get secret litellm-secrets -o yaml

   # View LiteLLM logs for guardrails errors
   kubectl -n litellm logs -l app.kubernetes.io/name=litellm | grep guardrails
   ```

### Health Checks

```bash
# Overall status
kubectl -n guardrails-ai get pods,svc

# Guardrails application status
kubectl -n guardrails-ai get pods -l app.kubernetes.io/name=guardrails

# Test API endpoints
kubectl -n guardrails-ai exec -it deployment/guardrails -- curl localhost:8000/guards
```
