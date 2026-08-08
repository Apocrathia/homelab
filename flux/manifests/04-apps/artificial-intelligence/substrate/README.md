# Agent Substrate

In-cluster actor runtime for kagent: gVisor sandbox workers, golden snapshots,
and WorkerPool lifecycle. Control + data plane live in `ate-system`; kagent
talks to it over in-cluster gRPC (no Gateway exposure).

> **Navigation**: [← Back to Artificial Intelligence README](../README.md)

## Overview

This deployment installs:

- `substrate-crds` — `WorkerPool` / `ActorTemplate` (`ate.dev/v1alpha1`)
- `substrate` — ate-api-server, ate-controller, atelet, and atenet (bundled
  Valkey and RustFS are disabled)
- `ate-valkey` — Valkey for ate-api persistence (`generic-app`)
- `ate-cache` — dedicated RustFS hot cache for regenerable actor snapshots
- `WorkerPool/kagent-default` — platform capacity for kagent (privileged ateom
  pods; kept here so PSA baseline in `kagent` does not block them)

kagent controller substrate flags live on the [kagent](../kagent/README.md)
HelmRelease. Keep that chart's bundled `substrate.enabled` off.

kagent releases vendor a specific substrate client version (the
`replace github.com/agent-substrate/substrate` line in kagent's `go/go.mod`).
Keep the deployed substrate chart at or below that version. Chart and CRDs are
held at `0.0.6` (paired with kagent `0.9.12`); close Renovate bumps until
[`docs/issues/substrate-kagent-version-skew.md`](../../../../../docs/issues/substrate-kagent-version-skew.md)
acceptance passes.

## Access

Internal only. API endpoint used by kagent:

`dns:///api.ate-system.svc:443`

## Configuration

Helm values in `helmrelease.yaml`. Auth mode is JWT with projected ServiceAccount
tokens; the chart generates TLS and session-signing material.

### Valkey

`HelmRelease/ate-valkey` (`generic-app`) is the Redis endpoint for ate-api
(`redis.clusterAddress`). The substrate chart's bundled Valkey is disabled.
Service: `ate-valkey.ate-system.svc:6379` (ClusterIP, plaintext, no AUTH —
same posture as the chart default under JWT auth mode).

### RustFS credentials

`HelmRelease/ate-cache` stores actor snapshots in the `ate-snapshots` bucket.
The substrate chart's bundled RustFS is disabled. Both RustFS and `atelet` read
the root keys from `OnePasswordItem/agent-substrate-secrets` with
`secretKeyRef`; credentials are never rendered into Helm values.

1Password item: `vaults/Secrets/items/agent-substrate-secrets`

| Field               | Maps to                                       |
| ------------------- | --------------------------------------------- |
| `access-key-id`     | `RUSTFS_ACCESS_KEY` / `AWS_ACCESS_KEY_ID`     |
| `access-key-secret` | `RUSTFS_SECRET_KEY` / `AWS_SECRET_ACCESS_KEY` |

See upstream:

- [Agent Substrate](https://kagent.dev/docs/kagent/examples/agent-substrate)
- [Agent Harness](https://kagent.dev/docs/kagent/examples/agent-harness)

## Authentication

No Gateway / Authentik surface. Clients authenticate to ateapi with Kubernetes
SA tokens (audience `api.ate-system.svc`).

## Troubleshooting

```bash
# Control / data plane
kubectl get pods -n ate-system

# CRDs from substrate-crds
kubectl get crd workerpools.ate.dev actortemplates.ate.dev

# atelet DaemonSet (privileged; needs PSA privileged on the namespace)
kubectl get ds -n ate-system
kubectl describe ds -n ate-system atelet

# Valkey (ate-api persistence)
kubectl get deploy,pods,svc -n ate-system -l app=ate-valkey
kubectl exec -n ate-system deploy/ate-valkey -- valkey-cli ping

# Init jobs
kubectl get jobs -n ate-system

# Platform WorkerPool (ateom workers)
kubectl get workerpool -n ate-system
kubectl get deploy,pods -n ate-system -l app=kagent-default 2>/dev/null
kubectl get pods -n ate-system | grep kagent-default
```
