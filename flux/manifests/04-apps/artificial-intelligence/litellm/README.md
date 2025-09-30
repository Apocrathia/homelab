# LiteLLM

Unified interface for 100+ LLMs with OpenAI proxy compatibility, allowing seamless integration with various AI models through a single API.

## Overview

LiteLLM provides a unified proxy server that translates OpenAI API calls to work with multiple LLM providers including Anthropic, Cohere, Hugging Face, and many others. It maintains OpenAI API compatibility while adding features like load balancing, cost tracking, and usage analytics.

## Features

- **Universal LLM Proxy**: Support for 100+ LLM providers with OpenAI-compatible API
- **Database Integration**: Model configurations and usage tracking stored in PostgreSQL
- **Cost Management**: Built-in spend tracking and budgeting capabilities
- **Load Balancing**: Distribute requests across multiple model deployments
- **Authentication**: Master key-based API access control
- **Analytics**: Comprehensive usage metrics and logging
- **Observability**: Automatic tracing and observability with MLflow

## Configuration

The deployment uses the database-optimized LiteLLM image with CloudNativePG PostgreSQL backend for persistent model configurations and usage data. All sensitive configuration including API keys, database credentials, and model configurations are managed through 1Password integration.

### Database Choice

This deployment uses CloudNativePG instead of the built-in Bitnami PostgreSQL chart due to [Broadcom's changes to the Bitnami catalog](https://github.com/bitnami/charts/issues/35164) which will remove free access to versioned images and require paid subscriptions. CloudNativePG provides a more reliable, community-friendly PostgreSQL solution for Kubernetes.

### Secret Configuration

Sensitive configuration is stored in 1Password under the `litellm-secrets` item. The following fields are required:

- `master-key`: Master key for API access control
- `username`: Database and UI username (shared)
- `password`: Database and UI password (shared)
- `model-config`: YAML array containing the model_list configuration
- `langfuse-public-key`: Langfuse public API key for observability
- `langfuse-secret-key`: Langfuse secret API key for observability
- `ollama-api-base`: Ollama API base URL for local LLM integration

**Note**: The `model-config` field is mounted as a separate volume from the 1Password secret and included in the main LiteLLM configuration via the `include` directive. This approach allows complex YAML structures to be properly handled while keeping all secrets in 1Password.

### Model Configuration

The `model-config` field in the 1Password secret should contain the model_list as a YAML array:

```yaml
model_list:
  # OpenAI models
  - model_name: gpt-4o
    litellm_params:
      model: gpt-4o
      api_key: "your-openai-api-key-here"
  - model_name: gpt-4o-mini
    litellm_params:
      model: gpt-4o-mini
      api_key: "your-openai-api-key-here"
  - model_name: gpt-3.5-turbo
    litellm_params:
      model: gpt-3.5-turbo
      api_key: "your-openai-api-key-here"

  # Claude models (if Anthropic key is provided)
  - model_name: claude-3-5-sonnet
    litellm_params:
      model: anthropic/claude-3-5-sonnet-20241022
      api_key: "your-anthropic-api-key-here"
  - model_name: claude-3-5-haiku
    litellm_params:
      model: anthropic/claude-3-5-haiku-20241022
      api_key: "your-anthropic-api-key-here"

  # Ollama models (local LLM server)
  - model_name: llama3.1
    litellm_params:
      model: ollama/llama3.1
      api_base: "http://ollama:11434"
  - model_name: codellama
    litellm_params:
      model: ollama/codellama
      api_base: "http://ollama:11434"
  - model_name: mistral
    litellm_params:
      model: ollama/mistral
      api_base: "http://ollama:11434"
```

This `model_list` array should be stored in the `model-config` field of the 1Password secret and will be included in the main configuration via the `include` directive.

### MLflow Integration

LiteLLM is integrated with MLflow for observability and tracing:

- **MLflow UI**: Available at `https://mlflow.gateway.services.apocrathia.com`
- **Tracing**: All LLM calls are automatically logged to MLflow
- **Experiments**: Track model performance, parameters, and metrics

### Langfuse Integration

LiteLLM is integrated with Langfuse for comprehensive LLM observability:

- **Langfuse UI**: Available at `https://langfuse.gateway.services.apocrathia.com`
- **Tracing**: All LLM calls are automatically logged to Langfuse
- **Analytics**: Track token usage, latencies, costs, and model performance
- **Dual Logging**: Calls are logged to both MLflow and Langfuse for comprehensive observability
- **Artifacts**: Store model artifacts and evaluation results

The integrations are automatically installed via sidecar containers that install MLflow and Langfuse dependencies into the main LiteLLM container during pod startup. The sidecars run continuously, checking and installing dependencies if needed. The pod readiness probes ensure LiteLLM doesn't start receiving traffic until both MLflow and Langfuse are properly installed and functional.

For detailed configuration and usage information, see the [official LiteLLM MLflow documentation](https://docs.litellm.ai/docs/observability/mlflow) and [Langfuse LiteLLM integration documentation](https://langfuse.com/integrations/gateways/litellm).

## Authentication

Access to the LiteLLM proxy requires a master key configured through the secret management system. Individual model API keys are also stored securely via 1Password.

## Usage

Once deployed, LiteLLM provides an OpenAI-compatible API endpoint that can route requests to multiple LLM providers based on the configured model list. The admin UI is available at `https://litellm.gateway.services.apocrathia.com` with authentik SSO integration.
