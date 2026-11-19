---
title: "OpenClaw harness needs a kagent 1.0 path (BYO/ACP reinvestigation)"
kind: feature
status: open
severity: low
source: agent
found_at: 2026-11-19
found_by: kagent-substrate-1.0-migration
area: agents
---

# OpenClaw harness needs a kagent 1.0 path (BYO/ACP reinvestigation)

## Problem / desired state

The kagent 1.0 API removed the `openclaw` AgentHarness backend upstream
(zero openclaw paths in the v1.0.1 tree; the v1alpha2 AgentHarness kind is
gone entirely). The resident OpenClaw coding harness — READY=False for 115
days on 0.10.x — has no direct migration: its CRs (agentharness.yaml,
rbac-ate-api.yaml, modelconfig.yaml) are deleted.

Desired state: a decision on whether to bring OpenClaw back as a BYO
harness (custom image implementing kagent's private A2A contract,
`spec.byo` + `workload.image`/`command`) or via an ACP-style bridge, or to
retire the concept.

## Repro

N/A (design gap, not a defect).

## Acceptance

- A written decision: BYO harness spike, ACP bridge, or retirement.
- If BYO: an OpenClaw container image implementing the A2A contract, a
  `Harness` CR with `byo` + pinned `workload.image`, and a smoke session
  through the kagent UI.

## Feedback loop

- `kubectl get harness -n openclaw` after any spike lands.
- Upstream contract: kagent v1.0.1 `go/api/v1alpha3/harness_types.go`
  (`BYOHarness`).

## Implementation hint

The dormant namespace, `openclaw-harness-secrets` 1Password item, and the
authentik blueprint are kept intentionally (this issue's reactivation
surface). The `tenzir-secrets`-style one-item/multi-CR pattern applies if
new fields are needed.

## Notes

- OpenClaw docs: https://docs.openclaw.ai
- The old harness's WorkerPool slot frees up with the 1.0 migration
  (namespace-local pools now).
