# Helm Repositories

One `HelmRepository` manifest per chart source, all in `flux-system`, applied
together by `kustomization.yaml` (`helm-repositories`). Every HelmRelease in
the tree resolves its chart through one of these entries.

> **Navigation**: [← Back to Helm README](../README.md)
