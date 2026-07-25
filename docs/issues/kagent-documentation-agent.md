---
title: "Add kagent documentation agent alongside knowledge-agent"
kind: feature
status: open
severity: medium
source: human
found_at: 2026-07-24
found_by: ian
area: agents
slice: hitl
---

# Add kagent documentation agent alongside knowledge-agent

## Problem / desired state

`knowledge-agent` answers via Qdrant memory, OpenZIM, DeepWiki, and
search-agent — good for personal memory and external/repo docs, weak for
curated product docs we crawl and own.

Upstream shows crawling a docs site into sqlite-vec (doc2vec), packaging an
MCP `query-documentation` tool, and wiring a Declarative agent to it
([Documentation agent](https://kagent.dev/docs/kagent/examples/documentation)).
Desired state: a documentation agent (or tool surface on knowledge-agent)
that complements — not replaces — knowledge-agent, for docs we choose to
index (homelab README tree, selected product docs, etc.).

## Acceptance

- Doc corpus build/update path exists (Job/CronJob or documented offline
  build) without committing secrets.
- MCP tool for doc query is reachable from kagent (RemoteMCPServer or kmcp
  once migrated).
- Agent (new or extended knowledge-agent) uses the tool with clear product/
  version params in the system message.
- Smoke question answered from indexed docs with an observable tool call.
- Scope of crawled sources is listed in the agent/MCP README (no silent
  crawl-the-internet).

## Feedback loop

- Build/render manifests for MCP + agent
- yamllint + Trivy on changed paths (image, deps)
- Manual: ask a known-doc question; confirm `query-documentation` (or
  equivalent) fires and answer cites the corpus
- Read-only: MCP + agent Ready/Available

## Implementation hint

Start with one corpus (e.g. this repo's operator docs or one upstream product
docset). Prefer GitOps image + PVC/ConfigMap for the DB over baking secrets
into images. Wire as a tool knowledge-agent can call, or a sibling agent
homelab-agent delegates to — pick one in alignment if unclear.

## Notes

- Complements Qdrant/OpenZIM/DeepWiki; do not duplicate DeepWiki's job for
  public GitHub repos unless we need offline copies.
- Image build/push location and registry auth follow existing lab patterns.
