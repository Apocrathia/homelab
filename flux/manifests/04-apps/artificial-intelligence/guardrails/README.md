# Guardrails AI

API server providing guardrails validation for LLM outputs using community validators from the [Guardrails Hub](https://www.guardrailsai.com/docs/concepts/hub). Designed to integrate with LiteLLM as a guardrails provider.

> **Reference Implementation**: Based on the [guardrails-lite-server](https://github.com/guardrails-ai/guardrails-lite-server) example from Guardrails AI.

## Features

- **Hub Validators**: Uses proven community validators from Guardrails Hub
- **API-Only Service**: Lightweight validation server for LiteLLM integration
- **Production Ready**: Validates secrets, toxicity, gibberish, and content length
- **LiteLLM Compatible**: Configured as guardrails provider in LiteLLM proxy

## Hub Validators Included

- **secrets-present-guard**: Prevents API keys, passwords, and sensitive data leakage
- **toxic-language-guard**: Blocks toxic, offensive, or harmful language
- **gibberish-guard**: Detects and prevents nonsensical or gibberish text
- **length-guard**: Validates text length constraints (1-1000 characters)
- **two-words-guard**: Ensures output contains exactly two words
- **email-guard**: Validates email format using regex

## LiteLLM Integration

Add to your LiteLLM `config.yaml`:

```yaml
guardrails:
  - guardrail_name: "secrets-present"
    litellm_params:
      guardrail: guardrails_ai
      guard_name: "secrets-present-guard"
      mode: "pre_call"
      api_base: "http://guardrails.guardrails-ai.svc.cluster.local:8000"
```

## Access

Internal API only at `http://guardrails.guardrails-ai.svc.cluster.local:8000` for cluster services.

## Available Guards

- `secrets-present-guard` - Prevents API keys, passwords, and sensitive data leakage
- `toxic-language-guard` - Blocks toxic, offensive, or harmful language
- `gibberish-guard` - Detects and prevents nonsensical or gibberish text
- `length-guard` - Validates text length constraints (1-1000 characters)
- `two-words-guard` - Ensures output contains exactly two words
- `email-guard` - Validates email format using regex

## Internal API Testing

```bash
# List available guards (from within cluster)
curl http://guardrails.guardrails-ai.svc.cluster.local:8000/guards

# Get guard details (from within cluster)
curl http://guardrails.guardrails-ai.svc.cluster.local:8000/guards/secrets-present-guard
```
