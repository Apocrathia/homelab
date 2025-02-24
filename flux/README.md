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
  --read-write-key
```

## Deploy

```bash
kubectl apply -k flux/manifests
```

## Reconcile

```bash
flux reconcile source git flux-system
flux reconcile kustomize flux-system
flux reconcile kustomize home
```
