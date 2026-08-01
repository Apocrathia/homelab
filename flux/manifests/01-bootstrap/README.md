# Bootstrap Configuration

Foundational GitOps resources required to reconcile the homelab cluster.

> **Navigation**: [← Back to Flux README](../README.md)

## Components

- [**Flux System**](flux-system/README.md) — Flux Operator, FluxInstance, root
  Git sync, Status UI authentication, and RBAC.
- [**1Password Connect**](1password/README.md) — secrets operator and setup.
- [**Helm Repositories**](helm/README.md) — shared chart sources.
- [**Custom Resource Definitions**](crds/README.md) — extended Kubernetes APIs.

## Steady-state reconciliation

1. Flux Operator reconciles the Flux controller distribution declared by the
   `FluxInstance`.
2. The FluxInstance Git sync reads `main` from this repository using the
   1Password-backed `flux-operator-secrets` SSH credentials.
3. The root Kustomization reconciles bootstrap children, then infrastructure,
   services, and applications follow their declared dependencies.

## First-time bootstrap

1. Run classic Flux bootstrap once to start the toolkit controllers and Git
   reconciliation.
2. Let GitOps install the Flux Operator from `flux-system/`.
3. Populate `flux-operator-secrets`, then reconcile the `FluxInstance` so the
   operator owns controllers and root sync.
4. Verify the FluxInstance and bootstrap Kustomizations are Ready before
   continuing with infrastructure, services, and applications.

See the [Flux System README](flux-system/README.md) for the required 1Password
field names and verification commands.

## Dependencies

- A Kubernetes cluster with Cilium CNI.
- Read access to this Git repository.
- A 1Password account and Connect deployment.
- Outbound access to configured Helm and container registries.

## Security

- Git authentication uses the SSH key in `flux-operator-secrets`.
- Secrets are sourced from 1Password rather than stored in Git.
- RBAC grants only the access required by bootstrap components.

## Verification

```bash
flux check
flux get all
kubectl get fluxinstance,fluxreport -n flux-system
kubectl get kustomizations -n flux-system
kubectl get pods -n onepassword-system
```

## References

- [Flux bootstrap](https://fluxcd.io/flux/installation/bootstrap/)
- [Flux Operator](https://fluxoperator.dev/)
- [1Password Connect](https://developer.1password.com/docs/connect)
