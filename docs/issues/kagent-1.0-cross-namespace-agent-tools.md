---
title: "kagent 1.0 dropped cross-namespace agent tools and chart agent subcharts"
kind: bug
status: open
severity: medium
source: agent
found_at: 2026-11-19
found_by: kagent-substrate-1.0-migration
area: agents
---

# kagent 1.0 dropped cross-namespace agent tools and chart agent subcharts

## Problem / desired state

The v1alpha3 API redesign removed two delegation mechanisms the homelab
agent fleet relied on:

1. `tools[].agent` (agent-as-tool) is now `tools[].subAgent`, which
   references a **same-namespace** AgentTemplate only. Cross-namespace
   references are structurally impossible
   (`go/api/v1alpha3/agenttemplate_types.go`, `SubAgentToolBinding`).
2. The kagent 0.10.x chart's built-in agent subcharts (`agents.k8s-agent`,
   `observability-agent`, promql-agent, helm-agent, cilium-\*-agent) are
   removed from the 1.0.1 chart; those Agents no longer exist.

Migration impact (this MR): homelab-agent keeps only the investigator
subAgent (same namespace, via AgentTemplate/investigator-agent) + the
discord MCP tool. It loses tools for k8s-agent, observability-agent (gone
with the subcharts) and media/infrastructure/git/knowledge-agent
(cross-namespace). knowledge-agent loses its search-agent tool.

Desired state: a deliberate delegation design on 1.0 — options: per-namespace
AgentTemplate copies (drift risk), upstream cross-namespace support, or
runtime A2A calls in place of compiled tools.

## Repro

- `kubectl get agent homelab-agent -n kagent -o jsonpath='{.spec.template.inline.tools}'`
  — only investigator subAgent + discord MCP remain.
- kagent v1.0.1 `SubAgentToolBinding` CEL: `templateRef` is a
  LocalObjectReference.

## Acceptance

- A decision + implementation restoring (or consciously dropping) the
  lost delegation edges, with the agents' systemPrompts updated to match
  whatever tool surface lands (the prompts were deliberately NOT rewritten
  in the migration MR). The rewrite must also drop stale mechanism text,
  not just tool lists — including investigator-agent's
  `/etc/tenzir/investigations-api-token` instruction (see Notes).

## Feedback loop

- Ask homelab-agent to delegate to git-agent / media-agent and observe the
  routing failure mode.

## Implementation hint

The investigator AgentTemplate pattern (agents/investigator/agenttemplate.yaml)
is the same-namespace template for subAgent bindings; replicating it per
consumer namespace is the mechanical path.

## Notes

- The a2aConfig.skills blocks (AgentCard advertising) were also dropped in
  the migration: v1alpha3 synthesizes the AgentCard from the template
  description (name + description only, empty skills). A2A discovery
  metadata is no longer authorable.
- Prompt staleness is not only the tool surface: investigator-agent's
  systemPrompt still tells the runtime to read the token from
  `/etc/tenzir/investigations-api-token`, which no longer exists — the
  token now arrives via the EgressPolicy gateway-injected `X-Tenzir-Token`
  header (`agents/investigator/egresspolicy.yaml`). The deferred prompt
  rewrite must drop that sentence along with the tool-list updates.
