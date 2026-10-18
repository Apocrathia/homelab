# Custom Resource Definitions (CRDs) — Bootstrap

CRDs applied during bootstrap. **Gateway API** CRDs and the pre-staged **OpenTofu** CRDs live here; Cilium, Kyverno, Longhorn, Prometheus, and the rest are installed by their Helm charts.

> **Navigation**: [← Back to Bootstrap README](../README.md)

## Overview

This layer installs Gateway API CRDs so they exist before any controller that uses them (e.g. Cilium). Everything else comes from the Helm chart that deploys that component.

- **Gateway API (standard channel)** — routing CRDs: `Gateway`, `HTTPRoute`,
  `TLSRoute`, and related types. Keep this at or above the version Cilium's
  Gateway API controller requires; see `kustomization.yaml`.
- **Gateway API Inference Extension** — `InferencePool` and related resources for
  inference workloads
- **OpenTofu (pre-stage)** — `ProviderConfig` and `Workspace` CRDs, vendored from
  the live cluster. The root bootstrap kustomization applies the tofu CRs at
  layer 01 (`flux-system/crossplane.yaml`), but the provider xpkg that owns
  these CRDs installs at layer 03 (`services-crossplane`); without the
  pre-stage, a fresh cluster deadlocks — the root build fails on the missing
  kinds, so every `dependsOn` chain below it never unblocks. The provider's
  later apply upgrades these CRDs in place. Same rule as the ClickHouse MR-1
  apply-order incident: bootstrap-layer CRs need their CRDs in the same root
  build.
- Versions and manifest URLs are in `kustomization.yaml`; Renovate tracks them

## Configuration

CRD sources and versions are defined in `kustomization.yaml`. Do not duplicate version numbers here.

## Security

CRDs are cluster-scoped. Bootstrap RBAC has the permissions needed to apply them. Validation is handled by the CRD OpenAPI schemas.

## Troubleshooting

```bash
# List Gateway API CRDs
kubectl get crd | grep gateway

# Inspect a CRD
kubectl explain gateway.networking.k8s.io
```

If a controller fails to start with a "no such resource" style error, confirm the CRDs are installed and that the controller runs after the bootstrap layer has reconciled.

## References

- **[Gateway API](https://gateway-api.sigs.k8s.io/)** — Official API docs
- **[Gateway API Inference Extension](https://github.com/kubernetes-sigs/gateway-api-inference-extension)** — Inference CRDs and usage
- **[Kubernetes CRDs](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)** — CRD concept and lifecycle
