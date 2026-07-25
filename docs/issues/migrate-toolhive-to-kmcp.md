---
title: "Migrate MCP hosting from ToolHive to kmcp"
kind: architecture
status: done
severity: high
source: human
found_at: 2026-07-24
found_by: ian
closed_at: 2026-07-25
area: agents
slice: hitl
---

# Migrate MCP hosting from ToolHive to kmcp

## Problem / desired state

In-cluster MCP servers were ToolHive `MCPServer` CRs. Desired state: host via
kmcp (`mcpserver.kagent.dev`); remove the ToolHive operator.

## Acceptance

- [x] MCP inventory declared via kmcp, not ToolHive `MCPServer`
- [x] LiteLLM and kagent agents reach the remaining functional set
- [x] Cilium / network-policy labels still gate MCP traffic; `toolhive-system`
      allow removed
- [x] ToolHive HelmRelease / HelmRepository removed from GitOps
- [x] `.agents/skills/mcp-deployment/SKILL.md` and `kagent/README.md` describe
      the kmcp path

## Notes

- Retired during migration: `osv`, `gofetch`, `mkp`, `plex`
- Leftover ToolHive CRDs may need a one-shot cluster delete after Flux prunes
  the operator (Helm often leaves CRDs behind)
- Follow-ups: `qdrant` image build (`cc`/pydantic-core);
  `docs/issues/kmcp-service-port-decoupling.md`
