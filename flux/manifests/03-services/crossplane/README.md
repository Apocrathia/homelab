# Crossplane

Crossplane control plane (core plus the upbound `provider-opentofu`
package) with the Crossview web dashboard.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

Crossplane turns external APIs into Kubernetes resources by installing
provider packages that register managed resource (MR) kinds. The core install
deployed here runs the API extensions controller, the RBAC manager, and the
package manager that pulls provider/function/configuration packages from OCI
registries on demand.

One provider is installed: `upbound/provider-opentofu` (see
[provider-opentofu](#provider-opentofu)), so the cluster can manage external
APIs through OpenTofu workspaces. Adding another provider is still a single
`Provider` manifest plus a `ProviderConfig` with credentials from a
1Password-backed secret.

- **Scope**: core control plane + `provider-opentofu` (OpenTofu workspaces)
- **CRDs**: applied by the chart init container (`crossplane core init`), not
  by Helm — Helm upgrades never skip CRD changes
- **Version line**: v2.x; cluster-scoped MRs are legacy in v2, namespaced MRs
  are the default

## Architecture

| Component     | Implementation                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| Control plane | `crossplane` chart from the official `crossplane-stable` repo                                                       |
| RBAC manager  | Enabled (chart default), 1 replica                                                                                  |
| Webhooks      | Enabled (chart default), served in-cluster on 9443                                                                  |
| Secrets       | None required — providers bring their own `ProviderConfig`                                                          |
| Dashboard     | [Crossview](https://github.com/crossplane-contrib/crossview) chart 4.6.0, `crossview-*` manifests in this directory |

## Adding a provider

1. Create a `Provider` manifest in this directory naming the OCI package
   (e.g. `xpkg.upbound.io/upbound/provider-opentofu:v1.1.8`).
2. Create a `ProviderConfig` referencing a 1Password-backed secret
   (`OnePasswordItem`, never a bare Secret).
3. Scope the managed resource activation policy to only the MRs actually
   used (`provider.packages.defaultActivations` or a `ManagedResourceActivationPolicy`)
   — Upjet-generated providers ship hundreds of CRDs otherwise.

Provider health should be checked on the
[Upbound Marketplace](https://marketplace.upbound.io/providers) before
adoption; several community providers (cloudflare, okta) are archived or
stale.

## provider-opentofu

[`upbound/provider-opentofu`](https://github.com/upbound/provider-opentofu)
v1.1.8 (`provider-opentofu.yaml`) runs OpenTofu modules against external
systems through `Workspace` managed resources — Pattern B from
[`docs/research/crossplane-connector-pattern.md`](../../../docs/research/crossplane-connector-pattern.md).
First consumers: headlamp's Authentik entry
(`flux/manifests/03-services/headlamp/crossplane.yaml`) and
chaos-mesh's (`flux/manifests/03-services/chaos-mesh/crossplane.yaml`) —
the chaos-mesh workspace owns a full proxy stack in one module, outpost
included (the `authentik_outpost` resource carries `protocol_providers`, so
the separate `authentik_outpost_provider_attachment` resource is retired).

- **CRDs**: 7 (Workspace, ProviderConfig, ProviderConfigUsage in both scopes
  plus namespaced ClusterProviderConfig) — small enough that no
  `defaultActivations` scoping is needed
- **Workspaces live per-app**: in the consuming app's directory and
  namespace, against a namespaced `ProviderConfig`
  (`opentofu.m.upbound.io/v1beta1`)
- **State**: each module declares a `kubernetes` backend
  (`in_cluster_config = true`); state lands as a `tfstate-*` Secret in the
  Workspace namespace — kept separate from the CI tofu stack's GitLab HTTP
  backend. The provider runtime SA already gets cluster-wide secret/lease
  access via the `crossplane:provider:<revision>:system` ClusterRole, so the
  backend needs no extra RBAC.
- **Credentials**: `OnePasswordItem` → Secret → namespaced
  `ProviderConfig.spec.credentials` array, materialized as a file in the
  workspace and read from HCL via `file()`. The Authentik API token is created
  by the
  [`terraform-service-account` blueprint](../authentik/blueprints/terraform-service-account.yaml)
  (service account + auto-generated key, never committed); copy the key once
  from Authentik into the 1Password item
- **Deletion**: deleting a Workspace runs `tofu destroy` by default
  (external objects go with the CR — the inverse of the blueprint
  ConfigMap pattern)

## Crossview dashboard

[Crossview](https://github.com/crossplane-contrib/crossview) renders providers,
managed resources, and compositions from live cluster state. It runs beside the
control plane in `crossplane-system` with a read-only ClusterRole
(get/list/watch — it can read secrets cluster-wide but cannot mutate) and a
CNPG PostgreSQL cluster (`crossview-postgres`, see `crossview-postgres.yaml`)
for session state — same pattern as every other DB-backed app. The chart's
bundled single-replica postgres stays disabled: it cannot roll in place on a
RWO Longhorn PVC.

- **URL**: `https://crossplane.gateway.services.apocrathia.com` (Gateway API
  HTTPRoute on `main-gateway`, chart-rendered); the SSO entrypoint is
  `/api/auth/oidc` — the root path serves the local login form
- **Auth**: native OIDC against Authentik — blueprint creates
  `crossview-oidc-provider` and a Platform-group launchpad entry
  (`authentik-blueprint.yaml`); local admin fallback via 1Password
- **Exposure**: admins only

### Bootstrap

1. The blueprint reconciles and creates the OIDC provider + application.
2. Copy the generated client ID and client secret from Authentik
   (Applications → Providers → `crossview-oidc-provider`) into the 1Password
   item `crossview-secrets` (vault `Secrets`).
3. The dashboard pod blocks on the missing secret keys until the item exists
   (same pattern as renovate-operator).

### 1Password item fields

| Field                | Used by                                |
| -------------------- | -------------------------------------- |
| `oidc-client-id`     | HelmRelease `valuesFrom`               |
| `oidc-client-secret` | OIDC env (secretKeyRef)                |
| `admin-username`     | local admin fallback login             |
| `admin-password`     | local admin fallback login             |
| `session-secret`     | session cookie signing                 |
| `db-password`        | chart DB password                      |
| `password`           | CNPG bootstrap (mirrors `db-password`) |

## Troubleshooting

```bash
kubectl -n crossplane-system get pods
kubectl -n crossplane-system logs deploy/crossplane
kubectl -n crossplane-system logs deploy/crossview
kubectl -n crossplane-system get cluster crossview-postgres
kubectl get httproute -n crossplane-system
kubectl get crds | grep crossplane.io
```
