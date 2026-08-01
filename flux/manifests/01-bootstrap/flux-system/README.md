# Flux System

Flux Operator manages the Flux controllers and root Git sync for the homelab.

> **Navigation**: [← Back to Bootstrap README](../README.md)

## Steady state

The operator is installed through `helmrepository.yaml` and `helmrelease.yaml`.
`flux-instance.yaml` declares the controller distribution and the
`GitRepository` sync for `main` at `./flux/manifests/01-bootstrap`.
`FluxInstance.spec.sync.pullSecret` references `flux-operator-secrets`.

`namespace.yaml` is the `flux-system` Namespace resource. `manifests.yaml`
defines the root Kustomization for the remaining bootstrap layers.

The FluxInstance patch keeps the generated root Kustomization at `prune: false`
with `deletionPolicy: Orphan`. This prevents removal of the bootstrap
Kustomization from cascading into managed resources.

## Flux Operator Status UI

The Status UI is available at
`https://flux.gateway.services.apocrathia.com` and uses two Authentik layers:

- The Authentik proxy protects the external endpoint.
- The native OIDC application `flux-operator-oidc` provides Status UI SSO and
  Kubernetes impersonation.
- `ClusterRoleBinding/flux-web-admins` maps the Authentik `flux-admins` group
  to `flux-web-admin`.

`authentik-blueprint.yaml` is generated into the
`authentik-blueprint-flux-operator` ConfigMap by this kustomization.

## Secrets

`secret.yaml` declares the 1Password item `flux-operator-secrets`. Its Secret
contains:

- `oidc-client-id` and `oidc-client-secret` for the Status UI.
- `identity` and `known_hosts` for Flux Git SSH authentication.

Flux requires the exact key names `identity` and `known_hosts`. In 1Password,
store `identity` as a multiline, non-concealed field so the private key retains
its newlines. `known_hosts` may be a single-line field. Never flatten the SSH
private key or store it as a concealed field.

## First-time bootstrap

A new cluster needs a short ownership handoff:

1. Run classic Flux bootstrap once so the toolkit controllers can reconcile
   this repository.
2. Let GitOps install the Flux Operator HelmRelease and its dependencies.
3. Ensure `flux-operator-secrets` is populated, then reconcile the
   `FluxInstance`; the operator assumes controller and sync ownership.

The vendored bootstrap manifests are not part of steady state. Recovery should
restore the same operator, FluxInstance, and 1Password-backed sync contract.

Do not use Kustomize `helmCharts` for the operator install because Flux's
kustomize-controller does not pass `--enable-helm`.

## Verification

```bash
flux check
flux get all
flux get helmrelease flux-operator -n flux-system
kubectl get pods -n flux-system
kubectl get fluxinstance,fluxreport -n flux-system
```

## Troubleshooting

```bash
flux get sources git
flux get kustomizations
kubectl logs -n flux-system deployment/source-controller
kubectl logs -n flux-system deployment/kustomize-controller
kubectl logs -n flux-system deployment/helm-controller
```

## References

- [Flux documentation](https://fluxcd.io/flux/)
- [Flux Operator documentation](https://fluxoperator.dev/)
- [Flux security](https://fluxcd.io/flux/security/)
