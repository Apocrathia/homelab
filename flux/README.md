# Flux

GitOps tool for managing Kubernetes resources in a Git repository.

> **Navigation**: [← Back to Talos Setup](../talos/README.md) | [Next: 1Password Connect Setup →](./manifests/01-bootstrap/1password/README.md)

## Documentation

- **[Flux Documentation](https://fluxcd.io/flux/)** - Official documentation
- **[Flux Bootstrap](https://fluxcd.io/flux/installation/bootstrap/)** - Bootstrap guide
- **[GitHub Repository](https://github.com/fluxcd/flux2)** - Source code and issues

## Installation

```bash
brew install fluxcd/tap/flux
```

## Bootstrap

```bash
flux bootstrap gitlab \
  --owner=apocrathia \
  --repository=homelab \
  --path=flux/manifests/01-bootstrap \
  --read-write-key \
  --reconcile
```

You will be asked for the GitLab Personal Access Token.

Note: 1password also needs to be manually configured with it's secret. See the 1password [README](./manifests/01-bootstrap/1password/README.md) for more details.

## Deploy

Through kubectl:

```bash
kubectl apply -k flux/manifests
```

Through flux:

```bash
flux create kustomization manifests \
  --depends-on=flux-system \
  --source=GitRepository/flux-system \
  --path="flux/manifests/" \
  --prune=true \
  --interval=5m
```

## Reconcile

```bash
flux reconcile source git flux-system
flux reconcile kustomization flux-system
flux reconcile kustomization manifests
```
