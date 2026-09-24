# Headlamp

Kubernetes web UI that replaces the retired kubernetes-dashboard. Provides resource browsing, editing, logs, and terminal access with OIDC authentication.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

This deployment includes:

- In-cluster Kubernetes dashboard with full resource management
- OIDC authentication via Authentik (reuses the `kubernetes` OIDC provider)
- Gateway API routing via Cilium
- Authentik dashboard entry managed by a Crossplane provider-opentofu `Workspace` (`crossplane.yaml`, pulling the shared `terraform/modules/authentik-app` module remotely)

## Access

- **URL**: `https://headlamp.gateway.services.apocrathia.com`

## Configuration

All configuration is handled through Helm values in `helmrelease.yaml`.

### Authentication

Uses the same Authentik OIDC provider as `kubectl` OIDC login. Users authenticate through Authentik and Headlamp uses the OIDC token to interact with the Kubernetes API. Access is controlled by Authentik group membership mapped to Kubernetes RBAC roles (see `authentik/kube-auth/`).

No secrets are required for the OIDC client itself -- it is a public client using PKCE. The Authentik dashboard entry (application + group binding) is managed by the Crossplane Workspace in `crossplane.yaml`, which reads its Authentik API token from 1Password item `crossplane-terraform-secrets` (field `authentik-terraform-token`). The Workspace is a thin shell: `source: Remote` pulls the shared module `terraform/modules/authentik-app` (pinned to the `generic-app-0.0.84` chart release tag; the create-chart-tag CI job pushes it minutes after merge, so the first reconcile fails once until the tag lands), and the module inputs live in the Workspace `varmap` — the full input set, since kustomize composes nothing. The module runs in `library` mode: headlamp has NO provider of its own — the tile + the `admins` binding are its whole Authentik footprint — and its OIDC login rides the blueprint-owned `kubernetes` OIDC provider (`authentik/kube-auth/`). ADOPT, not recreate: adoption ids never enter git — the migration gate injects them as a live patch on the Workspace varmap (kubectl patch, Flux suspended), adopting the existing objects in place (uuids intact, no deletion window); the `authentik-blueprint-cleanup.yaml` one-shot companion fired once and stays forever.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n headlamp

# Application logs
kubectl logs deployment/headlamp -n headlamp -f

# Verify OIDC callback is reachable
curl -sI https://headlamp.gateway.services.apocrathia.com/oidc-callback

# Check HTTPRoute
kubectl get httproute -n headlamp
```

## References

- **[Headlamp Documentation](https://headlamp.dev/docs/latest/)** - Primary documentation
- **[GitHub Repository](https://github.com/kubernetes-sigs/headlamp)** - Source code and issues
- **[Helm Chart](https://github.com/kubernetes-sigs/headlamp/tree/main/charts/headlamp)** - Chart source and values reference
