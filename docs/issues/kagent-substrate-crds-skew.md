---
title: "kagent 0.10.0 cannot create ActorTemplates against substrate 0.0.6 (CRD skew)"
kind: bug
status: open
severity: high
source: agent
found_at: 2026-09-05
found_by: sre-incident-20260905
area: agents
---

## Problem / desired state

The kagent 0.10.0 controller (rolled out 2026-09-05 after the kyverno webhook
blockage cleared) cannot create ActorTemplates against the installed
substrate-crds 0.0.6 schema. Every AgentHarness reconcile fails:

```
AgentTemplate.ate.dev "openclaw" is invalid:
[spec.runsc: Required value, spec.workerPoolRef: Required value, ...]
```

`AgentHarness/openclaw` is stuck READY=False; the resident harness workload
cannot start. The `apps-ai` Kustomization itself recovers once the manifest
fields removed in CRD v1alpha2 are dropped (separate MR), but harness
functionality stays down until this is resolved.

## Root cause: version skew

- kagent 0.10.0 builds ActorTemplates with `Spec.WorkerSelector`
  (`workerSelectorForPool`) and does not set `runsc` at all
  (`go/core/pkg/sandboxbackend/substrate/lifecycle_actortemplate.go` in the
  v0.10.0 tag). PauseImage comes from the `--substrate-pause-image` default.
- The installed substrate-crds 0.0.6 ActorTemplate CRD requires
  `["pauseImage","runsc","snapshotsConfig","workerPoolRef"]` — it has no
  `workerSelector` field.
- Upstream substrate is at v0.0.25 (installed: 0.0.6, applied 2026-08-08).
  kagent 0.10.0 was developed against newer substrate CRDs where the
  ActorTemplate schema changed (workerPoolRef -> workerSelector, runsc dropped
  or defaulted server-side).
- Evidence that old pairing worked: `kagent/hello-substrate` ActorTemplate
  (40d old) carries `workerPoolRef` + full `runsc` (gvisor nightly) +
  `pauseImage` matching kagent's default flag value.

## Desired state

Upgrade `flux/manifests/04-apps/artificial-intelligence/substrate/` charts
(substrate, substrate-crds) from 0.0.6 to a version compatible with kagent
0.10.0's emitted ActorTemplate shape (check upstream releases between v0.0.7
and v0.0.25; likely the latest). This includes the ate data plane images
(atecontroller, ateom-gvisor, ateapi) and possibly WorkerPool CR changes.

Alternative if the upgrade is involved: pin kagent back to 0.9.x until the
substrate upgrade lands (renovate would need an ignore).

## Repro

1. `kubectl get agentharness openclaw -n openclaw -o jsonpath='{.status.conditions[?(@.type=="Accepted")].message}'`
2. Watch kagent-controller logs during harness reconcile.

## Acceptance

- `kubectl get agentharness -A` shows openclaw READY=True
- `kubectl get actortemplates -n openclaw` shows a valid ActorTemplate
- kagent-controller logs show successful harness reconcile

## Feedback loop

- After the substrate chart bump merges: `kubectl get helmrelease -n ate-system substrate-crds substrate` both Ready, then AgentHarness openclaw becomes Ready within a reconcile interval.
