# OpenClaw

Resident OpenClaw coding harness on Agent Substrate (`AgentHarness`), accessed
through the kagent UI.

> **Navigation**: [<- Back to AI Applications README](../README.md)

## Overview

- `AgentHarness/openclaw` — substrate runtime, OpenClaw backend
- `ModelConfig/openclaw-model` — LiteLLM (`qwen3.6-prime`)
- `OnePasswordItem/openclaw-harness-secrets` — gateway token + LiteLLM API key
- Role/RoleBinding `openclaw-ate-api-env-sources` — lets
  `ate-system/ate-api-server` resolve ActorTemplate env `secretKeyRef`s in this
  namespace (same grant kagent's chart installs in `kagent`)

Rollback artifacts kept on disk but **not** in the active kustomization:

- `helmrelease.yaml` — former generic-app Deployment
- `openclaw.json` — former ConfigMap payload

## Secrets

1Password item: `vaults/Secrets/items/openclaw-secrets`

| Field             | Used by                                                           |
| ----------------- | ----------------------------------------------------------------- |
| `token`           | AgentHarness `gatewayTokenSecretRef` (CRD requires this key name) |
| `gateway-token`   | Legacy/generic-app; keep in sync with `token` if both exist       |
| `litellm-api-key` | ModelConfig / ActorTemplate `OPENAI_API_KEY`                      |

## Access

- **Primary**: kagent UI → AgentHarness `openclaw` (full OpenClaw Control UI)
- Former Gateway URL `https://openclaw.gateway.services.apocrathia.com` is
  retired with the generic-app HelmRelease

## Worker pool

Harness uses the controller default pool `ate-system/kagent-default` (omit
`workerPoolRef`). Each Ready harness pins a pool slot.

## References

- [OpenClaw Documentation](https://docs.openclaw.ai)
- [Agent Substrate rollout plan](../../../../docs/plans/agent-substrate-rollout.md)
- [kagent](../kagent/README.md) / [substrate](../substrate/README.md)
