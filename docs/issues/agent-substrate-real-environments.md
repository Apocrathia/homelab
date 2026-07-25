---
title: "Give agents real execution environments via Agent Substrate"
kind: architecture
status: open
severity: high
source: human
found_at: 2026-07-24
found_by: ian
area: agents
slice: hitl
---

# Give agents real execution environments via Agent Substrate

## Problem / desired state

Agents today are mostly chatbot inference plus MCP tool calls. There is no
Agent Substrate install, no `WorkerPool`, and no `SandboxAgent` /
`AgentHarness` targeting substrate. That caps what agents can do (no durable
sandbox, no gVisor actor lifecycle, no golden snapshots).

Desired state: Agent Substrate runs in-cluster; kagent controller has
substrate integration enabled; at least one Declarative `SandboxAgent` and/or
`AgentHarness` proves a real environment (shell/tools inside the sandbox, not
just LLM + remote MCP).

Upstream:
[Agent Substrate](https://kagent.dev/docs/kagent/examples/agent-substrate),
[Agent Harness](https://kagent.dev/docs/kagent/examples/agent-harness).

## Acceptance

- Substrate control/data plane installed via GitOps (chart versions pinned).
- kagent Helm values enable `controller.substrate.*` and a WorkerPool sized
  for harness + declarative sessions (see upstream replica guidance).
- One smoke agent on substrate reaches Ready; chat proves execution beyond
  pure inference (observable tool/sandbox activity).
- Docs note how substrate differs from plain Declarative pods for operators
  and agents.

## Feedback loop

- Flux/HelmRelease status for substrate + kagent (read-only)
- `kubectl get workerpool`, `sandboxagent` / `agentharness` Ready conditions
- yamllint + Trivy on new manifests
- UI smoke: chat + Substrate inventory (actor Suspended between sessions)

## Implementation hint

Enables `SandboxAgent` / optional `AgentHarness` on this cluster. Hermes
and OpenClaw stay on generic-app (native dashboard/TUI is load-bearing).
Follow upstream kind walkthrough patterns adapted here (Gateway,
1Password, no Ingress). Pin versions; do not chase floating `latest`.

## Notes

- Homelab kagent chart is already ≥ 0.9.x class — confirm substrate flags
  exist for the pinned chart before writing values.
- Capacity: long-lived harnesses pin WorkerPool slots; size replicas
  accordingly.
