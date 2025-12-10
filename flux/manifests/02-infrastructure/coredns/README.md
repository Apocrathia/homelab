# CoreDNS Configuration

GitOps management of the Talos-deployed CoreDNS.

Talos deploys CoreDNS during cluster bootstrap but doesn't expose replica configuration. This kustomization patches the deployment to control scaling.

## Configuration

- **Replicas**: 4 (configured in `deployment-patch.yaml`)

## Notes

- `prune: false` is set because Talos owns the base resource
- Flux applies patches on top of Talos-managed deployment
