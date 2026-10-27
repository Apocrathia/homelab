# ClickHouse operator layer

[Altinity Kubernetes Operator for ClickHouse](https://github.com/Altinity/clickhouse-operator)
manages the cluster, but this folder is operator-only: the `clickhouse`
namespace and the Altinity operator HelmRelease. The cluster the
operator manages — ClickHouseInstallation, Keeper, creds, and the
ClickHouse datalake — is dedicated to the Tenzir security stack and
lives nested under it:
[`flux/manifests/04-apps/security/tenzir/clickhouse/`](../../04-apps/security/tenzir/clickhouse/README.md)
(dedication is structural: the cluster exists to be that stack's
datalake; the operator stays at the services root because any future
clickhouse consumer reuses it).

> **Navigation**: [← Back to Services README](../README.md) | [Datalake / CR layer](../../04-apps/security/tenzir/clickhouse/README.md)

## Objects

| File                      | What it is                                                                  |
| ------------------------- | --------------------------------------------------------------------------- |
| `namespace.yaml`          | `clickhouse` namespace                                                      |
| `operator.yaml`           | Altinity clickhouse-operator (chart installs the CRDs via pre-install hook) |
| `flux-kustomization.yaml` | Flux Kustomization `services-clickhouse` (operator layer)                   |
| `kustomization.yaml`      | kustomize assembly for the two resources above                              |

The operator watches `clickhouse` and `tenzir` (`watchNamespaces`):
`tenzir` holds the relocated CHI/CKI store (2026-10-27), `clickhouse` is
the operator's own namespace and the finalizer path for the old CRs
pruned out of it by that relocation.

## Apply order

The Altinity operator HelmRelease installs the
`clickhouse.altinity.com` / `clickhouse-keeper.altinity.com` CRDs through
the chart's pre-install hook job - CRs applied before the hook completes
fail with "no matches for kind". The two Flux Kustomizations split the
layers: `services-clickhouse` (this folder: namespace + operator
HelmRelease) reconciles first; `services-clickhouse-cluster`
([the CR layer under the tenzir tree](../../04-apps/security/tenzir/clickhouse/README.md))
applies gated on it via `dependsOn` - the services-tetragon-policies /
services-chaos-mesh-experiments / services-renovate-operator-config
pattern.

## Validation

```bash
kustomize build flux/manifests/03-services/clickhouse > /dev/null
helm repo add altinity https://helm.altinity.com
helm template altinity-operator altinity/altinity-clickhouse-operator \
  --version 0.27.4 -n clickhouse \
  -f <(yq '.spec.values' flux/manifests/03-services/clickhouse/operator.yaml)
```
