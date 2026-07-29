# Hermes Agent

[Nous Research](https://nousresearch.com/) personal AI agent — web dashboard, messaging gateway, skills, and persistent memory. Model traffic goes through cluster LiteLLM.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Overview

This deployment includes:

- Gateway + web dashboard (`generic-app`, upstream `nousresearch/hermes-agent` image)
- Longhorn-backed state at `HERMES_HOME` (`/opt/data`)
- Static `config.yaml` reconciled into runtime config on every pod start
- Authentik OIDC for dashboard auth, Gateway HTTPRoute for ingress

## Access

- **URL**: `https://hermes-agent.gateway.services.apocrathia.com`

## Configuration

- **Static config**: `config.yaml` (ConfigMap) is the source of truth for keys defined in git; reconciled into the PVC on every pod start. Runtime-only settings from the UI/CLI persist across restarts.
- **OIDC**: Env vars in `helmrelease.yaml` (`HERMES_DASHBOARD_OIDC_*`), client id from 1Password
- **Channels** (Telegram, Discord, etc.): Dashboard or `hermes` CLI inside the pod after deploy

See `helmrelease.yaml` for deployment values.

### Secrets

Create the 1Password item at the path in `helmrelease.yaml`:

- `litellm-api-key` — LiteLLM virtual key for the custom provider endpoint and MCP gateway
- `oidc-client-id` — Authentik OIDC provider Client ID (from provider after blueprint apply)
- `oidc-client-secret` — Authentik OIDC provider Client Secret
- `grafana-api-key` — Grafana service account token (LiteLLM `x-mcp-x-grafana-api-key`)
- `ha-token` — Home Assistant long-lived access token (LiteLLM HA MCP header)
- `ma-token` — Music Assistant MCP bearer token
- `n8n-api-key` — n8n MCP HTTP bearer token
- `gitlab-token` — GitLab PAT for LiteLLM GitLab MCP (`x-mcp-gitlab-private-token`)

Optional channel tokens belong in 1Password, not git. Wire them in `helmrelease.yaml` only after confirming env var names in [Hermes environment variables](https://hermes-agent.nousresearch.com/docs/reference/environment-variables).

## Authentication

`generic-app` `authentik.mode: oidc` creates the OAuth2 provider + Authentik application. Hermes dashboard SSO uses self-hosted OIDC (confidential client + PKCE):

- Issuer: `https://auth.gateway.services.apocrathia.com/application/o/hermes-agent/`
- Callback: `https://hermes-agent.gateway.services.apocrathia.com/auth/callback`

## Initial setup

1. Create the 1Password item and reconcile Flux (or apply locally)
2. Confirm the Authentik blueprint created `hermes-agent-oidc-provider`
3. Copy the provider Client ID and Client Secret into 1Password; wait for the secret to sync
4. Open the URL → Hermes login → Sign in with Self-Hosted OIDC → Authentik
5. Confirm the default model in the dashboard or CLI (`hermes model`) — it must exist in `litellm.yml`

## Troubleshooting

```bash
kubectl get pods --namespace hermes-agent
kubectl logs --namespace hermes-agent deployment/hermes-agent -f
kubectl exec --namespace hermes-agent deploy/hermes-agent -- hermes doctor
```

Check the auth gate and provider registration:

```bash
curl -s https://hermes-agent.gateway.services.apocrathia.com/api/status \
  | jq '.auth_required, .auth_providers'
# true
# ["self-hosted"]
```

If the UI loads but chat fails, check LiteLLM reachability and that the default model in `/opt/data/config.yaml` matches a `model_name` in `litellm.yml`.

## References

- **[Hermes Agent documentation](https://hermes-agent.nousresearch.com/docs/)** — Primary documentation
- **[Hermes web dashboard / auth](https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard)** — OIDC provider setup
- **[GitHub — NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)** — Source and issues
