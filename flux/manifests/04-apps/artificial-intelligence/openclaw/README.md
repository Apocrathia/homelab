# OpenClaw

Resident OpenClaw coding harness on Agent Substrate (`AgentHarness`), accessed
through the kagent UI.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Overview

- `AgentHarness/openclaw` — substrate runtime, OpenClaw backend
- `ModelConfig/openclaw-model` — LiteLLM (`glm-5.3-prime`)
- `OnePasswordItem/openclaw-harness-secrets` — gateway token + LiteLLM API key
- Role/RoleBinding `openclaw-ate-api-env-sources` — lets
  `ate-system/ate-api-server` resolve ActorTemplate env `secretKeyRef`s in this
  namespace (same grant kagent's chart installs in `kagent`)

The authentik orphans (`openclaw-proxy-provider`, `openclaw-outpost`) are
removed by the `openclaw-cleanup` companion blueprint
(`flux/manifests/03-services/authentik/blueprints/openclaw-cleanup.yaml`) —
`state: absent` entries; blueprints never garbage-collect. Outpost deletions
can leave the `ak-outpost-openclaw-outpost` Deployment, Service, metrics
Service, and retired-hostname HTTPRoute behind in the authentik namespace;
verify and delete survivors explicitly (operator cluster mutation):

```bash
kubectl get deploy,svc,httproute -n authentik | grep openclaw
```

## Configuration

Defined by kagent CRs: `AgentHarness/openclaw` (substrate runtime) and
`ModelConfig/openclaw-model` (LiteLLM) — see `agentharness.yaml` and
`modelconfig.yaml`.

## Secrets

1Password item: `vaults/Secrets/items/openclaw-secrets`

| Field             | Used by                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `token`           | Legacy — kagent 0.10.0 removed `gatewayTokenSecretRef`; the gateway no longer authenticates with a bearer token. Safe to drop from the 1Password item |
| `gateway-token`   | Legacy/generic-app; keep in sync with `token` if both exist                                                                                           |
| `litellm-api-key` | ModelConfig / ActorTemplate `OPENAI_API_KEY`                                                                                                          |

## Access

- **Primary**: kagent UI → AgentHarness `openclaw` (full OpenClaw Control UI)
- **Authentik dashboard**: `authentik-blueprint.yaml` publishes a bookmark
  application pointing straight at the harness gateway
  (`https://kagent.gateway.services.apocrathia.com/api/agentharnesses/openclaw/openclaw/gateway`).
  It carries no provider — SSO comes from the kagent proxy provider that already
  covers `kagent.gateway.services.apocrathia.com`.

## Worker pool

Harness uses the controller default pool `ate-system/kagent-default` (omit
`workerPoolRef`). Each Ready harness pins a pool slot.

## References

- [OpenClaw Documentation](https://docs.openclaw.ai)
- [Agent Substrate rollout plan](../../../../../docs/plans/agent-substrate-rollout.md)
- [kagent](../kagent/README.md) / [substrate](../substrate/README.md)
