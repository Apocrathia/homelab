---
title: "Migrate MCP hosting from ToolHive to kmcp"
kind: architecture
status: open
severity: high
source: human
found_at: 2026-07-24
found_by: ian
area: agents
slice: hitl
plan: docs/plans/migrate-toolhive-to-kmcp.md
---

# Migrate MCP hosting from ToolHive to kmcp

## Problem / desired state

In-cluster MCP servers are ToolHive `MCPServer` CRs under
`flux/manifests/04-apps/artificial-intelligence/mcp-servers/` (18 servers,
one namespace each), with the operator in `03-services/toolhive/`. Clients
reach them via ToolHive proxies, LiteLLM `mcp_servers`, and kagent
`RemoteMCPServer`s.

kagent already ships with `kmcp.enabled: true` in the kagent HelmRelease, but
docs and inventory still prefer ToolHive. Desired state: MCP workloads are
hosted and discovered through kmcp; ToolHive operator and per-server CRs are
gone (or explicitly retained only where kmcp cannot cover a server).

## Acceptance

- MCP inventory is declared via kmcp (or kagent MCP CRDs), not ToolHive
  `MCPServer`.
- LiteLLM and kagent agents still reach the same functional set of tools
  (OSV, Grafana, Flux, Discord, Qdrant, etc., unless a server is deliberately
  dropped).
- Cilium / network-policy labels and client allowlists still gate MCP traffic.
- ToolHive HelmRelease / CRDs removed or documented as unused with a follow-up
  delete issue.
- `.agents/skills/mcp-deployment/SKILL.md` and `kagent/README.md` describe the
  kmcp path (no ToolHive-first guidance).

## Feedback loop

- `kustomize build` on `mcp-servers/` (or replacement tree) and kagent path
- `helm template` / Flux HelmRelease values for kagent kmcp settings
- yamllint on changed manifests
- Trivy on changed paths
- Read-only: list MCP CRs and probe one tool call per critical server via
  LiteLLM or kagent (no mutate without ask)

## Implementation hint

Large multi-lap migration. Inventory each ToolHive server against kmcp
capabilities first; migrate in waves (non-critical → critical). Update
`mcp-deployment` skill after the first successful pattern lands. Upstream:
[kmcp / kagent docs](https://kagent.dev/docs/).

## Notes

- Related: Discord MCP may move with Discord A2A rework
  (`discord-integration-upstream-a2a.md`).
- External-only MCP (context7, deepwiki, homeassistant) stay LiteLLM/remote;
  out of scope unless kmcp becomes the single registry.
