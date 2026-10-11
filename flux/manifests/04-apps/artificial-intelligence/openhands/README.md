# OpenHands

Self-hosted AI software-engineering agent platform: one pod runs the all-in-one
Agent Canvas image (web client, agent server, automation backend) on one PVC.

> **Navigation**: [← Back to Artificial Intelligence README](../README.md)

## Overview

This deployment includes:

- Upstream-chart StatefulSet, git-sourced (the chart lives in no Helm repo)
- One PVC holding settings, encrypted secrets, conversation history, the
  automation SQLite DB, and the agent workspace
- Authentik proxy outpost gating access and owning the hostname (no app HTTPRoute)
- No RBAC (the agent gets zero cluster permissions) and telemetry off throughout

## Access

- **URL**: `https://openhands.gateway.services.apocrathia.com`

## Required 1Password items

The pod stays **pending** until `openhands-secrets` exists. Create
`vaults/Secrets/items/openhands-secrets` with three fields:

| Field             | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `litellm-api-key` | Virtual LiteLLM proxy key for the seeded LLM profile |
| `oh-secret-key`   | Encryption key for stored settings and LLM profiles  |
| `session-api-key` | Session API key pasted into the UI on first use      |

The authentik side needs the shared `crossplane-terraform-secrets` item (field
`authentik-terraform-token`), same as headlamp and chaos-mesh's tofu tokens.

## Authentication

OpenHands has no local user accounts. Authentik's proxy provider gates the whole
app (admins and users groups). Tofu owns the authentik objects, running in the
Crossplane workspace here — state in the `tfstate-default-openhands` Secret,
logs in the opentofu provider pod (crossplane-system). Past the proxy, the app
asks for the session API key on first browser use — paste it once. The key is
not baked into served HTML; that mode stays off, and the app must never sit on
a bare route.

## LLM configuration

The default profile is seeded toward the in-cluster LiteLLM proxy
(`http://litellm.litellm.svc.cluster.local:4000`), e.g. a model like
`litellm_proxy/claude-sonnet-4-5`. Open **Settings > LLM** after first login,
point the profile's base URL at the proxy, and add more models there (encrypted
at rest with the secret key).

## Troubleshooting

```bash
# Pod status (pending = openhands-secrets item missing)
kubectl get pods -n openhands

# Application logs
kubectl logs -n openhands statefulset/openhands-agent-canvas -f

# Tofu run for the authentik stack
kubectl logs -n crossplane-system -l pkg.crossplane.io/provider=upbound-provider-opentofu --tail=100

# Render the chart locally at the deployed tag
git clone --depth 1 --branch v1.26.0 https://github.com/OpenHands/OpenHands /tmp/oh && helm template openhands /tmp/oh/helm/agent-canvas -n openhands

# Check the PVC bound
kubectl get pvc -n openhands
```

Agent streams ride WebSockets on `/sockets`. If sessions drop around a minute
of idle time, the gateway is timing them out — a BackendTrafficPolicy with a
longer idle timeout would fix it. Nothing here tunes that yet.

## References

- **[OpenHands documentation](https://docs.openhands.dev)** - Upstream docs
- **[OpenHands repository](https://github.com/OpenHands/OpenHands)** - Source, issues, and the chart at `helm/agent-canvas`
