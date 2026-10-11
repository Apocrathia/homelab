# OpenHands

Self-hosted AI software-engineering agent platform: one pod runs the all-in-one
Agent Canvas image (web client, agent server, automation backend) with a single
PVC for all state.

> **Navigation**: [← Back to Artificial Intelligence README](../README.md)

## Overview

This deployment includes:

- Single-replica StatefulSet from the upstream chart (git-sourced, since the
  chart is not published to any Helm repository)
- One PVC holding settings, encrypted secrets, conversation history, the
  automation SQLite DB, and the agent workspace
- Authentik proxy outpost gating access; the outpost owns the hostname, so there
  is no app HTTPRoute
- No RBAC (the agent runs with zero cluster permissions) and telemetry off across
  frontend, automation backend, and agent-server SDK

## Access

- **URL**: `https://openhands.gateway.services.apocrathia.com`

## Required 1Password item

The pod stays **pending** until the item exists. Create
`vaults/Secrets/items/openhands-secrets` with three fields:

| Field             | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `litellm-api-key` | Virtual LiteLLM proxy key for the seeded LLM profile |
| `oh-secret-key`   | Encryption key for stored settings and LLM profiles  |
| `session-api-key` | Session API key pasted into the UI on first use      |

## Authentication

OpenHands has no local user accounts. Authentik's proxy provider gates the whole
app (admins and users groups). Past the proxy, the app asks for a session API
key on first browser use — paste the `session-api-key` value once. The key is
not baked into served HTML; that mode stays off, and the app must never sit on
a bare route.

## LLM configuration

The default profile is seeded toward the in-cluster LiteLLM proxy
(`http://litellm.litellm.svc.cluster.local:4000`), e.g. a model like
`litellm_proxy/claude-sonnet-4-5` on that proxy. After first login, open
**Settings > LLM**, point the profile's base URL at the proxy, and add more
models as profiles in the same screen (stored server-side, encrypted with the
secret key).

## Troubleshooting

```bash
# Pod status (pending = openhands-secrets item missing)
kubectl get pods -n openhands

# Application logs
kubectl logs -n openhands statefulset/openhands-agent-canvas -f

# Render the chart locally at the deployed tag (matches the GitRepository ref)
git clone --depth 1 --branch v1.26.0 https://github.com/OpenHands/OpenHands /tmp/oh
helm template openhands /tmp/oh/helm/agent-canvas -n openhands

# Check the PVC bound
kubectl get pvc -n openhands

# Authentik outpost
kubectl get pods -n authentik | grep openhands
```

Agent streams ride WebSockets on `/sockets`. If sessions drop around a minute
of idle time, the gateway is timing them out; a BackendTrafficPolicy with a
longer idle timeout would fix it. Nothing in this repo tunes that yet, so there
is no precedent file to copy.

## References

- **[OpenHands documentation](https://docs.openhands.dev)** - Upstream docs
- **[OpenHands repository](https://github.com/OpenHands/OpenHands)** - Source, issues, and the chart at `helm/agent-canvas`
