---
title: "Replace jank Discord bridge with upstream kagent A2A pattern"
kind: feature
status: open
severity: medium
source: human
found_at: 2026-07-24
found_by: ian
area: agents
slice: hitl
---

# Replace jank Discord bridge with upstream kagent A2A pattern

## Problem / desired state

Discord → agent today is a custom Python bridge
(`agents/homelab/bridge/`) calling kagent A2A, plus a ToolHive Discord MCP
for outbound tools, sharing a bot token via 1Password. It works, but it is
homegrown glue.

Upstream documents Discord ↔ kagent via A2A
([Discord and A2A](https://kagent.dev/docs/kagent/examples/discord-a2a),
repo `lekkerelou/kagent-a2a-discord`): mention/channel filters, env-driven
config, Docker image. Desired state: steal the durable upstream patterns
(auth, intents, mention-only, channel allowlist, A2A URL shape) and replace
or shrink our bridge so we are not maintaining a one-off forever.

## Acceptance

- Discord message → agent reply path uses an upstream-aligned design (forked
  image, vendored minimal bridge, or documented deliberate divergence).
- Mention-only and/or channel allowlist behavior is configurable without
  code edits.
- Secrets remain 1Password Item CRs; Grafana Discord alerting stays separate.
- Homelab agent Discord tools still work (or an explicit replacement is
  documented if Discord MCP moves with kmcp).
- Bridge README matches reality; dead custom code removed.

## Feedback loop

- `kustomize build` / `helm template` on bridge (or replacement) manifests
- yamllint + Trivy on changed paths
- Manual: send mention in allowlisted channel; confirm A2A hit and reply
- Read-only: bridge pod logs without dumping tokens

## Implementation hint

Compare `agents/homelab/bridge/src/main.py` to upstream bot behavior; prefer
adopting their image/env contract over rewriting from scratch. Coordinate
token/MCP ownership with ToolHive→kmcp and any AgentHarness Slack/Discord
channel specs.

## Notes

- Tasks (`scheduled-agent-invoke`, `run-loop-agent-invoke`, `alert-agent-invoke`)
  that post via the agent may need a smoke check after the bridge changes.
- Hermes/OpenClaw optional Discord tokens are out of scope unless those apps
  move to harness channels in the same lap.
