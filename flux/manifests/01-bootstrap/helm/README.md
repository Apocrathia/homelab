# Helm Repository Management

Flux `HelmRepository` sources for every chart the cluster deploys.

> **Navigation**: [← Back to Bootstrap README](../README.md)

## Overview

- One `HelmRepository` per source, all in `repositories/` (plain HTTP charts)
  or OCI (registry references). Flux reconciles each source on its configured
  interval and serves chart indices to the `HelmReleases` that reference them.
- The inventory is the directory itself: `repositories/kustomization.yaml`
  lists every source. Do not duplicate the list or the update intervals here;
  they drift. `ls flux/manifests/01-bootstrap/helm/repositories/` or
  `kubectl get helmrepositories -n flux-system` shows the current set.
- Chart versions are pinned per `HelmRelease`; Renovate bumps them.

## Troubleshooting

```bash
# Check repository status
kubectl get helmrepositories -n flux-system

# Check repository synchronization
kubectl describe helmrepository <name> -n flux-system

# Manual sync
flux reconcile source helm <repository-name>

# Check Flux source-controller logs
kubectl logs -n flux-system deployment/source-controller
```

## References

- **[Helm Repository Guide](https://helm.sh/docs/topics/chart_repository/)** - Official documentation
- **[Flux HelmRepository](https://fluxcd.io/flux/components/source/helmrepositories/)** - Flux integration
- **[Artifact Hub](https://artifacthub.io/)** - Chart discovery
