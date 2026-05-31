# Hermes Agent

[Nous Research](https://nousresearch.com/) personal AI agent — web dashboard, messaging gateway, skills, and persistent memory. Model traffic goes through cluster LiteLLM.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Overview

This deployment includes:

- Gateway + web dashboard (`generic-app`, upstream `nousresearch/hermes-agent` image)
- Longhorn-backed state at `HERMES_HOME` (`/opt/data`)
- Seed `config.yaml` for LiteLLM (custom OpenAI-compatible provider)
- Authentik proxy in front of the dashboard

## Access

- **URL**: `https://hermes-agent.gateway.services.apocrathia.com`

## Configuration

- **Bootstrap**: Seed `config.yaml` (ConfigMap) for LiteLLM URL and default model; runtime edits persist on the PVC
- **Secrets**: LiteLLM virtual key as `OPENAI_API_KEY` (see below)
- **Channels** (Telegram, Discord, etc.): Dashboard or `hermes` CLI inside the pod after deploy

See `helmrelease.yaml` for deployment values.

### Secrets

Create the 1Password item at the path in `helmrelease.yaml`:

- `litellm-api-key` — LiteLLM virtual key for the custom provider endpoint

Optional channel tokens belong in 1Password, not git. Wire them in `helmrelease.yaml` only after confirming env var names in [Hermes environment variables](https://hermes-agent.nousresearch.com/docs/reference/environment-variables).

## Authentication

Authentik **proxy** provider handles SSO. Dashboard OAuth is disabled in the deployment because access is already gated upstream.

## Initial setup

1. Create the 1Password item and reconcile Flux
2. Open the URL and sign in through Authentik
3. Confirm the default model in the dashboard or CLI (`hermes model`) — it must exist in `litellm.yml`

## Troubleshooting

```bash
kubectl get pods -n hermes-agent
kubectl logs -n hermes-agent deployment/hermes-agent -f
kubectl exec -n hermes-agent deploy/hermes-agent -- hermes doctor
```

If the UI loads but chat fails, check LiteLLM reachability and that the default model in `/opt/data/config.yaml` matches a `model_name` in `litellm.yml`.

## References

- **[Hermes Agent documentation](https://hermes-agent.nousresearch.com/docs/)** — Primary documentation
- **[GitHub — NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)** — Source and issues
