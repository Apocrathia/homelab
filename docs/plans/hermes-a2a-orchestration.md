---
title: Hermes A2A broker registration + orchestration map
status: active
branch: fix/hermes-a2a-orchestration
source: docs/issues/hermes-agent-orchestration-gaps.md
---

# Hermes A2A orchestration

## Goal

Hermes (and other LiteLLM MCP clients) can `a2a_register_agent` against
kagent base A2A URLs, list the live fleet including user agents, round-trip
`a2a_send_message`, and follow a documented need→agent map.

## Facts (2026-08-16)

- All user `Agent` CRs are Ready/Accepted and serve
  `/.well-known/agent-card.json` under `/api/a2a/<namespace>/<name>/`.
- Issue repro used `kagent/<user-agent>` — wrong namespace; cards 404 there.
- `/.well-known/agent.json` returns HTTP 200 JSON-RPC `INVALID_REQUEST`.
- `a2a-mcp-server` fetch uses `agent.json` and passes that body to
  `AgentCard(**data)` → Pydantic errors on base-URL register.
- Registering the card path "works" for list, but `send_message` POSTs to the
  **registration** URL → 405 on the card path. Base URL register is required.

## Slices

1. **a2a-bridge-card-path** — after `pip install a2a-mcp-server`, rewrite
   well-known path strings to `agent-card.json` in the installed client code;
   document base-URL registration for all agents in `mcp-servers/a2a/README.md`.
2. **orchestration-map** — durable map under `.agents/context/` (self-improve /
   Hermes: A2A vs direct MCP fallback). Link from agents README if needed.

## Out of scope

- Cluster apply/reconcile (operator).
- Persistent A2A registry PVC (`/tmp/a2a-data` stays ephemeral).
- kagent chart card metadata / empty `version` (tracked elsewhere).
- Discord A2A bridge replacement.

## Feedback loop

- Local: `kustomize build` agents + mcp-servers/a2a; `yamllint` on changed YAML;
  `prettier` on changed markdown.
- Live (after operator apply): register base URLs → `a2a_list_agents` →
  `a2a_send_message` to `k8s-agent`; curl `agent-card.json` for each user agent.
