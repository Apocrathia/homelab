---
title: "prime-agent payload commits never roll the pod — manual restart required"
kind: bug
status: open
severity: medium
source: dogfood
found_at: 2026-09-23
found_by: agent (a2a-webhook lap)
area: agents
slice: hitl
---

# prime-agent payload commits never roll the pod — manual restart required

## Problem / desired state

prime-agent boots by pulling this repo (repo-pull boot model, commit
`f98a72936`): the boot script `git pull --ff-only` on the PVC clone and
`cp -u` the `agent/` payload (extensions, seeded settings) onto
`~/.prime/agent/`. Consequence: **a merged commit that only changes the
payload (`agent/extensions/*`, `agent/settings.json`) changes nothing until
someone restarts the pod.** There is no checksum annotation on the Deployment
pod template, no ConfigMap the controller can watch, no rollout trigger — the
deployed agent can silently run stale extensions for days while `main` and the
README say otherwise.

`prime-agent/README.md` ("Inject more agent files": "Commit it to `main`; the
next pod restart pulls the clone") documents the trap as the expected
procedure; the troubleshooting section even says "restart the pod to
re-sync".

Predecessor trap (same lap, 2026-09-23, a2a-webhook): ConfigMap-only changes
never restarted the pod — "proven twice this lap, will bite every future
payload-only deploy." The payload ConfigMap era ended at f98a72936, but the
repo-pull successor has the identical blast shape: payload merges do not
apply themselves.

## Repro

1. Commit an `agent/extensions/<name>/index.ts` change to `main`.
2. Observe: no HelmRelease/Kustomization field changes → no rollout; the pod
   keeps the old payload (verify via the running extension's behavior or
   `~/.prime/agent` contents).
3. `kubectl rollout restart -n prime-agent` is the only thing that applies it.

## Acceptance

- A merged payload-only commit triggers a pod rollout without manual
  intervention (or: the operator explicitly accepts the manual-restart
  procedure and this issue closes as documented-risk).
- Idle commits that do not touch `agent/` do not churn the pod (or the churn
  tradeoff is accepted and recorded here).

## Feedback loop

- `helm template`/`kustomize build` renders; `kyverno apply` / policy dry-run
- After a test payload commit: pod age resets without a manual
  `rollout restart`; extension behavior matches `main`.

## Implementation hint

Clone the proven stamp-annotation pattern from
`flux/manifests/03-services/kyverno/policies/reload-crossview-on-configmap-change.yaml`
(its own annotations say "Copy this file for other apps with the same chart
gap"; target must be static per kyverno#5546). The crossview policy fires on a
ConfigMap write; prime-agent's payload source is a git commit, so it needs a
render-time artifact to watch — e.g. a small `prime-agent-payload-sha`
ConfigMap fed from the `GitRepository` revision via Flux kustomize
`replacements`, then the cloned Kyverno policy stamps the changing annotation
on the prime-agent Deployment. Open design question: a full-SHA trigger
restarts the pod on _every_ main push (churn) vs a payload-tree-scoped
trigger (pre-compute during render). Decide in the implementing lap.

## Notes

- Source lap: a2a-webhook, session 01a0c4ed (2026-09-23). The issue was
  offered then ("the issue is earning its keep") and never filed. The
  repo-pull boot model was verified live in that lap.
- Global memory "ConfigMap era dead" refers to the payload-ConfigMap
  transport, not this rollout gap.

**Next action (gate):** operator decision — build the reload policy (kyverno
clone + payload-sha trigger) or explicitly accept the README-documented
manual restart as the cost of repo-pull boot.
