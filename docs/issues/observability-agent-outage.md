---
title: "observability-agent MCP init Forbidden — in-cluster metrics delegation broken"
kind: bug
status: open
severity: medium
source: agent
found_at: 2026-09-22
found_by: agent (chaos-mesh etcd strain lap)
area: observability
slice: hitl
---

# observability-agent MCP init Forbidden — in-cluster metrics delegation broken

## Problem / desired state

During the chaos-mesh etcd-strain measurement lap (2026-09-22, session
01a0c9ab), delegating cluster-metrics work through the in-cluster agent mesh
failed end to end:

- The **observability-agent's MCP session init returned `Forbidden`** — its
  Prometheus/Grafana tool layer was dead, so it could answer nothing that
  needed metrics.
- The **k8s-agent fallback had a poisoned session** (400s on retry after a
  malformed tool-call).
- The observability-agent honestly refused to fabricate numbers and handed
  back the raw PromQL pack; the lap completed by running those queries
  through the local Grafana/Prometheus MCP path instead.

The lap's verdict line: "The observability-agent outage deserves an issue."
It was never filed, nothing was fixed, and no later lap re-tested the path.

Live state (2026-10-10): the observability-agent pod is Running (kagent
namespace) and the kagent `Agent` CR is READY=True, so the surface looks
healthy from inventory checks — but the tool-layer failure state is unverified
since 2026-09-22. The LiteLLM broker roster (correctly) does not register the
system agents; they are meant to be composed by `homelab-agent` through the
kagent controller, which is exactly the path that failed.

Desired: the observability-agent answers a metrics question end-to-end via
A2A using its own MCP tools.

## Repro

1. Delegate a metrics question to `homelab-agent` via the LiteLLM A2A broker,
   asking it to compose the observability-agent for a live PromQL (e.g. "p99
   WAL fsync by node, last hour").
2. Expected (at filing): the observability-agent leg fails at MCP session
   init with `Forbidden`; no metrics returned through the agent path.
3. Workaround (proven 2026-09-22): query Prometheus/Mimir directly via
   Grafana MCP — fine for an agent with that path, dead for kagent-side
   consumers.

## Acceptance

- observability-agent completes a live metrics request through its own MCP
  tools — no `Forbidden` at session init.
- k8s-agent session health re-checked in the same lap (no poisoned-session
  retry-400s).
- The A2A delegation path (`prime-agent`/`hermes` → `homelab-agent` →
  system agent) is exercised, not just the pod inventory.

## Feedback loop

- `a2a_send` to homelab-agent with an observability-agent-composed metrics
  ask (read-only; answers arrive as task replies)
- `kubectl logs -n kagent observability-agent-<pod>` during the call — MCP
  init errors visible if present
- `kubectl get agents -A` (inventory green ≠ tool layer green — this issue
  exists because of that gap)

## Implementation hint

The 403/Forbidden is at the MCP layer, not the A2A layer — start at the kmcp
`MCPServer` objects and the kagent MCP wiring (e.g. `kagent-grafana-mcp` and
any prometheus MCP server CRs): compare the observability-agent's MCP config
and the backing service account/RBAC against an agent whose tools work.
Cluster mutation to fix is a separate operator ask; investigation is read-only.

## Notes

- Full etcd-strain numbers (unaffected, part of the same lap verdict) live in
  `.scratch/chaos-mesh-etcd-strain.json`. That lap's actual ask — etcd strain
  — was answered (negligible, idle-operator footprint only); this issue tracks
  only the broken metrics-delegation side-finding.
- System agents (k8s/helm/observability/cilium-\*) not being on the LiteLLM
  broker is by design (see `litellm.yml`); do not "fix" that as part of this
  issue.

**Next action (gate):** operator green-lights a read-only debug lap on the
observability-agent MCP layer; any live fix that falls out is a separate ask.
