---
title: "Hermes agent: A2A broker registration and agent orchestration gaps"
kind: bug
status: open
severity: medium
source: agent
found_at: 2026-07-29
found_by: hermes
area: agents
slice: afk
---

# Hermes agent: A2A broker registration and agent orchestration gaps

## Problem / desired state

Hermes Agent is wired into the homelab self-improvement work graph
(`.agents/skills/self-improve/`) but cannot fully orchestrate the kagent A2A
agent fleet due to three gaps:

1. **A2A bridge registration mismatch.** The LiteLLM MCP bridge
   (`mcp__litellm__a2a_register_agent`) fetches `/.well-known/agent.json` to
   resolve agent cards. kagent serves cards at `/.well-known/agent-card.json`.
   Hitting `agent.json` returns a JSONRPC `INVALID_REQUEST` error, so every
   `a2a_register_agent` call fails with Pydantic validation errors (missing
   `name`, `url`, `version`, `capabilities`, `skills`). Hermes can curl the
   JSONRPC endpoints directly but cannot use the native A2A tools.

2. **6 user agents not registered on the kagent broker.** `git-agent`,
   `infrastructure-agent`, `media-agent`, `search-agent`, `knowledge-agent`,
   and `home-agent` are defined as `Agent` CRs in
   `flux/manifests/04-apps/artificial-intelligence/agents/` but do not serve
   agent cards on the broker. Only the `homelab-agent` and the system agents
   (`k8s-agent`, `helm-agent`, `cilium-policy-agent`, `cilium-manager-agent`,
   `observability-agent`) are live. Hermes handles GitLab, HA, Proxmox,
   TrueNAS, UniFi, Servarr, SearXNG, and Firecrawl directly via LiteLLM MCP
   proxies in the meantime.

3. **No documented delegation map.** The self-improvement work graph defines
   which skills to invoke at each step but does not specify which A2A agents
   to call when. A mapping of "need X → call agent Y" is needed so that Hermes
   and other orchestrators know when to delegate to a kagent A2A agent vs
   handle directly via MCP.

Desired state: Hermes can register and message all kagent A2A agents through
the LiteLLM bridge natively, all user agents are live on the broker, and the
orchestration map is documented in `.agents/` for future agents to follow.

## Repro

```bash
# Bridge registration fails
# Via mcp__litellm__a2a_register_agent with any kagent URL
# Error: 5 validation errors for AgentCard (name, url, version, capabilities, skills all missing)

# Card endpoint mismatch
curl -s http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/kagent/homelab-agent/.well-known/agent.json
# Returns JSONRPC INVALID_REQUEST

curl -s http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/kagent/homelab-agent/.well-known/agent-card.json
# Returns valid AgentCard JSON

# Missing agents
for agent in git-agent infrastructure-agent media-agent search-agent knowledge-agent home-agent; do
  curl -s "http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/kagent/${agent}/.well-known/agent-card.json" | head -1
  # Returns JSONRPC INVALID_REQUEST for each
done
```

## Acceptance

- LiteLLM A2A bridge can register kagent agents without errors
- `mcp__litellm__a2a_list_agents` returns all live agents including the 6
  user agents currently missing
- `mcp__litellm__a2a_send_message` successfully sends a message to any
  registered agent and receives a response
- An orchestration map is documented under `.agents/` or
  `docs/` describing which A2A agent to call for each work graph step
- Hermes direct MCP coverage (GitLab, HA, Flux, Grafana, etc.) remains as a
  fallback path, documented alongside the A2A delegation map

## Feedback loop

- `curl` the `agent-card.json` endpoint for each user agent and confirm valid
  JSON
- Call `mcp__litellm__a2a_list_agents` and confirm all 12+ agents are returned
- Send a test message to `k8s-agent` via `mcp__litellm__a2a_send_message` and
  confirm a response
- `kustomize build flux/manifests/04-apps/artificial-intelligence/agents` for
  any manifest changes
- `yamllint` on changed YAML

## Implementation hint

The bridge mismatch may be fixable via:
1. An HTTPRoute rewrite rule on the kagent Gateway API route that rewrites
   `/.well-known/agent.json` → `/.well-known/agent-card.json`
2. A LiteLLM bridge config option to set the well-known path
3. A small proxy sidecar

The 6 missing agents may need their namespaces checked, or may need to be
deployed/reconciled. Check `kubectl get agents -A` for their status.

The orchestration map has been drafted at
`.scratch/agent-orchestration-map.md` and should be promoted to
`.agents/` or `docs/` once finalized.

## Notes

- System agents (k8s, helm, cilium-policy, cilium-manager, observability) are
  enabled in the kagent helmrelease and are live on the broker.
- The `kagent-agent-card-metadata` issue tracks icon/card metadata fields and
  is blocked on kagent chart `0.10.0-beta`.
- Hermes has direct MCP access to most services through LiteLLM proxies, so the
  A2A gap is a quality-of-life and delegation issue, not a hard blocker.
- The `discord-integration-upstream-a2a` issue tracks the Discord bridge
  replacement which is related but separate.
