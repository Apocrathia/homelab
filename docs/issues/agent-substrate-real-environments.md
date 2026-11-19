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

Shipped (verified in tree 2026-11-19): Agent Substrate + the
`kagent-default` WorkerPool run in `ate-system`, kagent (0.10.6) carries the
substrate integration values, and the `hello-substrate` smoke `SandboxAgent`
is deployed; the original "no substrate, no WorkerPool" problem is closed.

Remaining acceptance residue:

- The operator/agent docs note on substrate vs plain Declarative pods
  (lifecycle, snapshots, WorkerPool slots, Go-only, footprint, PSA).
- The deferred Hermes `AgentHarness` (was gated on a stable kagent 0.10;
  kagent is now 0.10.6; re-triage the deferral).

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

- Homelab kagent chart is already ≥ 0.9.x class; confirm substrate flags
  exist for the pinned chart before writing values.
- Capacity: long-lived harnesses pin WorkerPool slots; size replicas
  accordingly.
