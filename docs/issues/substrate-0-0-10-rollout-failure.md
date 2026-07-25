---
title: "Substrate rustfs Deployment deadlocks on any pod-template change"
kind: bug
status: open
severity: high
source: agent
found_at: 2026-07-25
found_by: agent-substrate-rollout
area: artificial-intelligence
slice: afk
---

# Substrate rustfs Deployment deadlocks on any pod-template change

## Problem / desired state

The `substrate` chart's in-cluster RustFS cannot survive a Helm upgrade that
changes its pod template. Any such upgrade hangs, times out, and Flux
remediates back. This blocks both chart version bumps and RustFS credential
rotation.

Desired state: a pod-template change to RustFS (image bump, credential
rotation, resource change) completes without manual intervention.

Two independent defects combine:

| #   | Defect                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `Deployment/rustfs` uses `RollingUpdate` (`maxSurge: 25%` → 1) against the **ReadWriteOnce** Longhorn PVC `rustfs-data`. The replacement pod cannot attach while the old pod holds the volume, so the rollout never converges. The chart exposes no `strategy` value.                          | `Warning FailedAttachVolume … Multi-Attach error for volume "pvc-ba3f9eb6-…" Volume is already used by pod(s) rustfs-6c6f67c5df-…` |
| 2   | `Job/rustfs-bucket-init` is a plain Helm-managed Job with no `helm.sh/hook` annotation. Job pod templates are immutable, so once its env changes, server-side apply fails on every upgrade retry. Deleting the Job once is not enough — Helm recreates it, then the next retry collides again. | `Job.batch "rustfs-bucket-init" is invalid: spec.template: Invalid value: … field is immutable`                                    |

Observed failure signature:

```text
Helm upgrade failed for release ate-system/substrate with chart substrate@0.0.6:
timeout waiting for: [Deployment/ate-system/rustfs status: 'InProgress',
                      Job/ate-system/rustfs-bucket-init status: 'InProgress']
```

`HelmRelease/substrate` is therefore held at chart `0.0.6` with `image.tag`
`v0.0.6`. The `0.0.10` upgrade fails with the same mechanism.

Not a factor: Valkey. Chart `0.0.6` already ships `valkey/valkey:8.0`, the
cluster is healthy (`cluster_state:ok`, 6 nodes, size 3), and a
`SIGSEGV` in `ateredis.(*Persistence).getSortedMasters` (`ateredis.go:511`)
seen on a `v0.0.6` pod is a separate symptom, not this cause.

## Repro

1. Change anything in the RustFS pod template — e.g. set
   `rustfs.accessKey` / `rustfs.secretKey` to new values, or bump
   `spec.chart.spec.version` to `0.0.10`.
2. Reconcile `HelmRelease/substrate`.
3. `Deployment/rustfs` reports `InProgress`; the new pod logs a Multi-Attach
   error. `Job/rustfs-bucket-init` fails server-side apply as immutable.
4. Helm times out, Flux rolls back, and the old pod template is restored.

## Acceptance

- A RustFS credential rotation lands without manual scaling or Job deletion.
- `HelmRelease/substrate` reaches `Ready` on the current chart version with a
  matching `image.tag`, and the version hold comment is removed.
- The 18 existing objects under `s3://ate-snapshots/` remain listable
  afterwards, and `AgentHarness/openclaw` still reports `Ready`.

## Feedback loop

```bash
flux get helmrelease substrate -n ate-system
kubectl get rs -n ate-system | grep rustfs        # one active RS, no stuck second
kubectl get events -n ate-system | grep -i multi-attach   # expect none
kubectl get agentharness -A
```

## Implementation hint

Options, roughly in order of preference:

1. **Move snapshots to external S3.** The chart documents this:
   set `rustfs.enabled=false` and point `atelet` at the external endpoint via
   `atelet.extraEnv` / `atelet.extraArgs` (`atelet.storageBackend: s3`).
   Removes the RWO single-replica Deployment entirely and lines up with the
   pending MinIO migration.
2. **Fix upstream.** RustFS should be a StatefulSet, or the Deployment should
   set `strategy.type: Recreate`; `rustfs-bucket-init` should carry
   `helm.sh/hook: post-install,post-upgrade` with
   `helm.sh/hook-delete-policy: before-hook-creation`.
3. **Manual workaround per change.** Scale `Deployment/rustfs` to 0, delete
   `Job/rustfs-bucket-init`, reconcile, scale back up. Does not survive
   unattended Flux reconciles, so it is a stopgap only.

## Notes

- `workerpool.yaml` pins `ateom-gvisor:v0.0.6`, so `0.0.6` is the coherent set
  today. Bump it alongside the chart.
- Renovate annotations are intentionally left in place, so Renovate will keep
  proposing `0.0.10`. Decline those MRs until this is resolved.
- Helm's immutable-Job error message embeds the whole rendered pod template,
  so any credential passed as plaintext env lands in Kubernetes Events. See
  `substrate-rustfs-credentials.md`.
- Related: `substrate-rustfs-credentials.md`,
  `agent-substrate-real-environments.md`.
