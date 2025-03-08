# Flux

Flux is a tool for managing Kubernetes resources. It is a GitOps tool that allows you to manage your Kubernetes resources in a Git repository.

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
  --path="./manifests/" \
  --prune=true \
  --interval=5m
```

## Reconcile

```bash
flux reconcile source git flux-system
flux reconcile kustomize flux-system
flux reconcile kustomize home
```
