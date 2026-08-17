# Hermes Agent (BYO shim)

kagent `BYO` agent that fronts the [hermes-agent](../../hermes-agent/) app so
kagent agents can delegate to Hermes over A2A. The BYO container is a small
stdlib-only proxy ([`src/server.py`](./src/server.py)) that serves the A2A
agent card on port 8080 (kagent's BYO contract) and forwards JSONRPC requests
to Hermes' own A2A endpoint with the bearer token attached.

> **Navigation**: [← Back to Agents README](../README.md)

## Why a shim

kagent agents can only call other kagent `Agent` CRs or MCP servers — there is
no remote-A2A agent type (verified through kagent 0.10 upstream). The proxy
makes Hermes' external A2A endpoint look like a native agent, so delegation
from `homelab-agent` uses the standard `type: Agent` tool path with full
task/streaming semantics.

## Flow

```text
homelab-agent --A2A--> hermes-agent.agent-hermes:8080 (proxy)
                           |  + Authorization: Bearer <token>
                           v
                       hermes-agent.hermes-agent:9900 (hermes-agent app)
```

## Configuration

| Env                       | Source                                    | Purpose                              |
| ------------------------- | ----------------------------------------- | ------------------------------------ |
| `HERMES_A2A_URL`          | static                                    | Hermes A2A endpoint                  |
| `HERMES_PROXY_URL`        | static                                    | This proxy's URL (card rewriting)    |
| `HERMES_A2A_BEARER_TOKEN` | `agent-hermes-secrets`/`a2a-bearer-token` | Same token as `hermes-agent-secrets` |

## Secrets

Requires 1Password item `agent-hermes-secrets` in Secrets vault with:

| Field              | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| `a2a-bearer-token` | Hermes A2A bearer token (same value as `hermes-agent-secrets`) |

## Updating the proxy

`hermes-proxy-src` is generated with `disableNameSuffixHash` (the Agent CR
references it by name), so editing `src/server.py` does not roll the pod
automatically:

```bash
kubectl -n agent-hermes rollout restart deployment/hermes-agent
```
