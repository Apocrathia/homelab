---
title: "Set iconUrl and A2A card metadata on kagent agents"
kind: feature
status: blocked
severity: low
source: human
found_at: 2026-07-25
found_by: ian
area: agents
slice: afk
---

# Set iconUrl and A2A card metadata on kagent agents

## Problem / desired state

kagent agents render in the UI and on their A2A `AgentCard` with no icon,
provider attribution, docs link, or version. `AgentSpec` gained four optional
fields for this — `iconUrl`, `documentationUrl`, `version`, and `provider`
(`organization` + `url`) — which the controller copies onto
`/.well-known/agent-card.json`.

The pinned chart is `0.9.12`, whose `AgentSpec` has none of these fields, so
the apiserver rejects them today. They exist as of the `0.10.0-beta` line.

Desired state: once kagent is on a chart that carries the fields, every
`Agent` / `SandboxAgent` in the repo advertises at minimum an icon, with
`documentationUrl` pointing at the agent's README.

Agents in scope:

- `agents/git`, `agents/home`, `agents/homelab`, `agents/infrastructure`,
  `agents/knowledge`, `agents/media`, `agents/search`
- `kagent/hello-substrate` (`SandboxAgent`)

`AgentHarness` (`openclaw`) has no icon field — only `description`. Skip it.

## Repro

N/A — gated on the chart version, not a defect.

## Acceptance

- kagent chart is on a version whose `agents` / `sandboxagents` CRDs expose
  `spec.iconUrl`.
- Each in-scope agent manifest sets `iconUrl`, and `documentationUrl` where a
  README exists.
- Icons are served from a stable URL, following the Authentik blueprint
  convention already used by apps in this tree (raw GitLab URL to an
  `icon.svg` / `icon.png` beside the manifest).
- No agent is rejected on apply for URI-format validation — all four
  URL-shaped fields (`iconUrl`, `documentationUrl`, `provider.url`) are
  parsed as URIs by the apiserver.

## Feedback loop

- `kustomize build flux/manifests/04-apps/artificial-intelligence/agents`
- `yamllint` on changed manifests
- Read-only Flux MCP: agent Kustomization reconciled, `Agent` objects
  `Accepted=True`
- Fetch `/.well-known/agent-card.json` for one agent and confirm `iconUrl`
  round-trips
- Eyeball the kagent UI agent list

## Implementation hint

Fields are siblings of `description` under `spec` (not nested under
`declarative`). Same shape on `SandboxAgent`, which inlines `AgentSpec`.
Verify the icon URLs resolve before applying — a 404 renders as a broken
image, not a fallback.

## Notes

- Field reference:
  [kagent API docs](https://www.kagent.dev/docs/kagent/resources/api-ref).
- `provider` and `version` are optional; consider `provider.organization`
  for consistency across the fleet, and skip `version` unless the agents get
  a real versioning story.
