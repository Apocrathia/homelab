# Agent Substrate

In-cluster actor runtime for kagent: gVisor sandbox workers, golden snapshots,
and WorkerPool lifecycle. Control + data plane live in `ate-system`; kagent
talks to it over in-cluster gRPC (no Gateway exposure).

> **Navigation**: [← Back to Artificial Intelligence README](../README.md)

## Overview

This deployment installs:

- `substrate-crds` — `WorkerPool` / `ActorTemplate` (`ate.dev/v1alpha1`)
- `substrate` — ate-api-server, ate-controller, atelet, atenet, Valkey, RustFS
- `WorkerPool/kagent-default` — platform capacity for kagent (privileged ateom
  pods; kept here so PSA baseline in `kagent` does not block them)

kagent controller substrate flags live on the [kagent](../kagent/README.md)
HelmRelease. Keep that chart's bundled `substrate.enabled` off.

## Access

Internal only. API endpoint used by kagent:

`dns:///api.ate-system.svc:443`

## Configuration

Helm values in `helmrelease.yaml`. Auth mode is JWT with projected ServiceAccount
tokens; the chart generates TLS and session-signing material.

RustFS uses chart-default credentials for the initial smoke. Replace before
treating this as durable — see
`docs/issues/substrate-rustfs-credentials.md`.

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

# Init jobs
kubectl get jobs -n ate-system

# Platform WorkerPool (ateom workers)
kubectl get workerpool -n ate-system
kubectl get deploy,pods -n ate-system -l app=kagent-default 2>/dev/null
kubectl get pods -n ate-system | grep kagent-default
```
