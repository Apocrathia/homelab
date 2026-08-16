---
title: Hermes A2A broker registration + orchestration map
status: done
branch: fix/hermes-a2a-orchestration
source: docs/issues/hermes-agent-orchestration-gaps.md
---

# Hermes A2A orchestration

## Goal

Hermes (and other clients) can list and invoke the live kagent A2A fleet
through LiteLLM, and follow a documented need→agent map.

## Outcome

- kagent agents are registered in LiteLLM `litellm.yml` under top-level
  `agents:` (`agent_card_params`, `protocolVersion: "0.3"`).
- Clients use `GET /v1/agents` and `POST /a2a/{agent_name}` (native Agent
  Gateway). The LiteLLM MCP `a2a` bridge (`mcp-servers/a2a`) is removed.
- Need→A2A→MCP fallback map:
  [`.agents/context/agent-orchestration.md`](../../.agents/context/agent-orchestration.md).

## Feedback loop (post-change)

- Local: `kustomize build` on agents + mcp-servers + litellm; `yamllint` /
  `prettier` on touched files.
- Live: `GET /v1/agents` lists configured agents; `POST /a2a/homelab-agent`
  `message/send` round-trips.
