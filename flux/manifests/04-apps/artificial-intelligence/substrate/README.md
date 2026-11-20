# Agent Substrate

In-cluster actor runtime for kagent: gVisor sandbox workers, golden snapshots,
and WorkerPool lifecycle. Control + data plane live in `ate-system`; kagent
talks to it over in-cluster gRPC (no Gateway exposure).

> **Navigation**: [← Back to Artificial Intelligence README](../README.md)

## Overview

This deployment installs (substrate chart 1.0.1 — auth redesigned around the
in-cluster IdP + pod-identity mTLS, valkey replaced by postgres):

- `substrate-crds` — `WorkerPool` (v1) / `SandboxConfig` / `CSIDriverConfig`
  (`ate.dev`); ActorTemplate is gone
- `substrate-podcert` (ns `podcertificate-controller-system`) — signs
  service-DNS / pod-identity / postgres certificates, publishes the
  ClusterTrustBundles every client validates against
- `substrate-postgres` — CNPG Cluster (new state store)
- `substrate-atelet` — node agent on its own release (skew policy: upgrade
  before the substrate release)
- `substrate` — ate-api-server, ate-controller, atenet router/egress,
  ate-idp-server
- `ate-cache` — dedicated RustFS hot cache for regenerable actor snapshots

WorkerPools moved next to their agents: kagent 1.0 references them
namespace-locally from Harnesses, and the whole agent fleet consolidated
into `kagent`, so the single `kagent-default` pool there serves everything
(the `agent-*` pools are gone with their namespaces).

kagent controller substrate endpoints live in `config.substrate` on the
[kagent](../kagent/README.md) HelmRelease; the chart defaults match this
release (`dns:///api.ate-system.svc:443`, `https://atenet-router.ate-system.svc:443`,
`https://idp.ate-system.svc`).

kagent releases vendor a specific substrate client version (the
`replace github.com/agent-substrate/substrate` line in kagent's `go/go.mod`).
Keep the deployed substrate chart at or below that version. Chart and CRDs are
held at the pinned kagent pairing (see `helmrelease.yaml`); close Renovate bumps
until the substrate-kagent version-skew issue's acceptance passes (superseded
by the merged kagent/substrate 1.0.1 upgrade; delete-on-ship'd, git history
is the archive).

## Access

Internal only. API endpoint used by kagent:

`dns:///api.ate-system.svc:443`

## Configuration

Helm values in `helmrelease.yaml`:

- `preview: [PerTemplateSnapshotLocation, GoldenEgressPolicy]` — kagent
  Harnesses set per-ActorTemplate snapshot locations; GoldenEgressPolicy is
  the same gate contract for the per-template egress JWT
  (`actor_template.golden_egress_policy`). The API rejects those fields
  without the gates.
- `rustfs.enabled: false` — snapshots live in `ate-cache` instead (see
  `ateApi.snapshotLocation` + `objectStorePlugin.extraEnv`).
- `ateApi.authorization.bootstrapOwners` — API authorization owners:
  `system:serviceaccount:ate-system:ate-client` (the release's shared
  principal, the chart default) and the kagent controller's SPIFFE ID
  (`spiffe://cluster.local/ns/kagent/sa/kagent-controller`), which calls
  the API as its own identity.
- `atelet.enabled: false` — atelet is its own release (`atelet-helmrelease.yaml`).
- Postgres login: the CNPG bootstrap `substrate` user serves both the owner
  and read/write connection strings (single-login posture, like kagent's
  database); strings live in `OnePasswordItem/substrate-postgres`.

## Authentication

No Gateway / Authentik surface. substrate 1.0 replaced the 0.0.x Kubernetes
JWT issuer discovery (broken on Talos) with its own IdP: `ate-idp-server`
issues actor JWTs (`https://idp.ate-system.svc`), and workload identity is
pod-identity mTLS signed by `substrate-podcert`. kagent mounts the
pod-identity credentials via `controller.substrateClientCertificate.enabled`.

Cluster prerequisite: the kube-apiserver feature gates in
`talos/patches/unified-patch.yaml` (ClusterTrustBundle,
ClusterTrustBundleProjection, PodCertificateRequest +
`certificates.k8s.io/v1beta1` runtime config).

## Rollout (0.0.x -> 1.0.x)

The 1.0.1 upgrade is operator-gated, not apply-and-forget:
`workerpools.ate.dev` moves v1alpha1 -> v1 (single served version, no
conversion webhook), and Kubernetes rejects a CRD update that drops a
version still listed in `status.storedVersions` — the `substrate-crds`
HelmRelease fail-loops until `WorkerPool/kagent-default` is deleted and the
CRD status is patched. The kagent side swaps its whole API group, so the
agent fleet is deleted and recreated across the swap (bounded outage).
Exact merge-time sequence:
[kagent-substrate-1.0-rollout.md](../../../../../docs/plans/kagent-substrate-1.0-rollout.md).

First-install note: the CNPG cluster is a plain CR, not a HelmRelease, so
`substrate` cannot dependsOn it (same posture as litellm) — the HelmRelease
remediation-retries until `substrate-postgres` and its bootstrap Secret
converge. Retries during first boot are expected.

## Secrets (1Password)

| Item / OnePasswordItem                                  | Fields                                                                                                                                                                                                                                                                                                                 | Used by                                                                                                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agent-substrate-secrets`                               | `access-key-id`, `access-key-secret`, **`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`**                                                                                                                                                                                                                                 | ate-cache, substrate object-store plugin, substrate-atelet (`objectStore.credentialsSecret`)                                                                              |
| `agent-substrate-secrets` (consolidated substrate item) | object-store keys, `username`, `password`, `ownerConnectionString`, `readWriteConnectionString`, and the three CA pool JSON fields (`service-dns-ca-pool`, `pod-identity-ca-pool`, `postgres-ca-pool` — generate once: `go run ./cmd/ate-setup create podcertificate-controller-cas` from a substrate v1.0.1 checkout) | ate-system consumers via `OnePasswordItem/agent-substrate-secrets` + `OnePasswordItem/substrate-postgres`; podcert signers via External Secrets (`podcert-ca-pools.yaml`) |
| `cnpg-backups-secrets`                                  | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`                                                                                                                                                                                                                                                                           | substrate-postgres barman backups                                                                                                                                         |

## Troubleshooting

```bash
# Control / data plane
kubectl get pods -n ate-system
kubectl get pods -n podcertificate-controller-system

# CRDs from substrate-crds
kubectl get crd workerpools.ate.dev sandboxconfigs.ate.dev

# Certificate trust bundles published by podcert
kubectl get clustertrustbundles

# CA pools consumed by podcert (External Secrets from agent-substrate-secrets)
kubectl get secrets -n podcertificate-controller-system

# Database
kubectl get cluster -n ate-system substrate-postgres

# atelet DaemonSet (privileged; needs PSA privileged on the namespace)
kubectl get ds -n ate-system substrate-atelet

# Platform WorkerPools (one per agent namespace now)
kubectl get workerpool -A
```

## References

- **[Agent Substrate](https://kagent.dev/docs/kagent/examples/agent-substrate)** - Upstream substrate example
- **[Agent Harness](https://kagent.dev/docs/kagent/examples/agent-harness)** - Upstream harness example
