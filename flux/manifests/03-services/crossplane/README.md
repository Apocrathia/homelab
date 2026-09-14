# Crossplane

Crossplane control plane. Core only — no providers, functions, or
configurations are installed.

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

| Component     | Implementation                                                |
| ------------- | ------------------------------------------------------------- |
| Control plane | `crossplane` chart from the official `crossplane-stable` repo |
| RBAC manager  | Enabled (chart default), 1 replica                            |
| Webhooks      | Enabled (chart default), served in-cluster on 9443            |
| Secrets       | None required — providers bring their own `ProviderConfig`    |

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

## Troubleshooting

```bash
kubectl -n crossplane-system get pods
kubectl -n crossplane-system logs deploy/crossplane
kubectl get crds | grep crossplane.io
```
