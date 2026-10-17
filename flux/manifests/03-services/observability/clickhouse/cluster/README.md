# ClickHouse CR layer

The custom resources behind the `ocsf` query store: the
ClickHouseInstallation, its Keeper ensemble, and the OnePasswordItem that
materializes their credentials. Everything here is a CR, so it can only
apply after the Altinity operator has installed the
`clickhouse.altinity.com` / `clickhouse-keeper.altinity.com` CRDs - this
layer is its own Flux Kustomization (`services-clickhouse-cluster`) gated
on `dependsOn`. The operator, namespace, and the full apply-order story
live one level up ([../README.md](../README.md)).

> **Navigation**: [← Back to ClickHouse README](../README.md)

## Objects

| File                      | What it is                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `secret.yaml`             | OnePasswordItem `clickhouse-secrets` (dedicated `clickhouse-secrets` vault item)              |
| `keeper.yaml`             | ClickHouseKeeperInstallation `keeper` - 3-node Keeper ensemble                                |
| `cluster.yaml`            | ClickHouseInstallation `ocsf` - 1 shard x 3 replicas, users, tiered storage, schema bootstrap |
| `flux-kustomization.yaml` | Flux Kustomization `services-clickhouse-cluster` (this layer's gate)                          |
| `kustomization.yaml`      | kustomize assembly for the three CRs above                                                    |

## Why a separate layer

The operator chart installs both CRDs through its pre-install hook job -
CRs applied before that hook completes fail with "no matches for kind".
`services-clickhouse-cluster` therefore applies only after its gates clear:

- `services-clickhouse` - the Altinity operator itself (installs both CRDs).
- `bootstrap-1password` - OnePasswordItem CRD + operator (renders `secret.yaml`).
- `infrastructure-longhorn` - both CRs provision Longhorn PVCs.

This is the house pattern (services-tetragon-policies /
services-chaos-mesh-experiments / services-renovate-operator-config); the
failure mode and the fix are in the
[parent README](../README.md#apply-order).
