# Headlamp

Kubernetes web UI that replaces the retired kubernetes-dashboard. Provides resource browsing, editing, logs, and terminal access with OIDC authentication.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

This deployment includes:

- In-cluster Kubernetes dashboard with full resource management
- OIDC authentication via Authentik (reuses the `kubernetes` OIDC provider)
- Gateway API routing via Cilium

## Access

- **URL**: `https://headlamp.gateway.services.apocrathia.com`

## Configuration

All configuration is handled through Helm values in `helmrelease.yaml`.

### Authentication

Uses the same Authentik OIDC provider as `kubectl` OIDC login. Users authenticate through Authentik and Headlamp uses the OIDC token to interact with the Kubernetes API. Access is controlled by Authentik group membership mapped to Kubernetes RBAC roles (see `authentik/kube-auth/`).

No separate secrets are required -- the OIDC client is a public client using PKCE.

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
