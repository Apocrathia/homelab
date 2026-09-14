# Crossplane

Crossplane control plane (core only — no providers, functions, or
configurations) with the Crossview web dashboard.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

Crossplane turns external APIs into Kubernetes resources by installing
provider packages that register managed resource (MR) kinds. The core install
deployed here runs the API extensions controller, the RBAC manager, and the
package manager that pulls provider/function/configuration packages from OCI
registries on demand.

No provider is installed yet, so the cluster gains the Crossplane CRDs and
controllers but manages nothing external. Adding a provider is a single
`Provider` manifest plus a `ProviderConfig` with credentials from a
1Password-backed secret.

- **Scope**: core control plane, zero configuration
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

## Adding a provider later

1. Create a `Provider` manifest in this directory naming the OCI package
   (e.g. `xpkg.upbound.io/crossplane-contrib/provider-kubernetes`).
2. Create a `ProviderConfig` referencing a 1Password-backed secret
   (`OnePasswordItem`, never a bare Secret).
3. Scope the managed resource activation policy to only the MRs actually
   used (`provider.packages.defaultActivations` or a `ManagedResourceActivationPolicy`)
   — Upjet-generated providers ship hundreds of CRDs otherwise.

Provider health should be checked on the
[Upbound Marketplace](https://marketplace.upbound.io/providers) before
adoption; several community providers (cloudflare, okta) are archived or
stale.

## Crossview dashboard

[Crossview](https://github.com/crossplane-contrib/crossview) renders providers,
managed resources, and compositions from live cluster state. It runs beside the
control plane in `crossplane-system` with a read-only ClusterRole
(get/list/watch — it can read secrets cluster-wide but cannot mutate) and a
bundled PostgreSQL 17 database on Longhorn for session state.

- **URL**: `https://crossplane.gateway.services.apocrathia.com` (Gateway API
  HTTPRoute on `main-gateway`, chart-rendered)
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

| Field                | Used by                    |
| -------------------- | -------------------------- |
| `oidc-client-id`     | HelmRelease `valuesFrom`   |
| `oidc-client-secret` | OIDC env (secretKeyRef)    |
| `admin-username`     | local admin fallback login |
| `admin-password`     | local admin fallback login |
| `session-secret`     | session cookie signing     |
| `db-password`        | bundled PostgreSQL         |

## Troubleshooting

```bash
kubectl -n crossplane-system get pods
kubectl -n crossplane-system logs deploy/crossplane
kubectl -n crossplane-system logs deploy/crossview
kubectl get httproute -n crossplane-system
kubectl get crds | grep crossplane.io
```
