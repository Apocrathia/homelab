# Crossview

Web dashboard for Crossplane resources — providers, managed resources,
compositions, and their status, rendered from live cluster state.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

[Crossview](https://github.com/crossplane-contrib/crossview) is the
crossplane-contrib React dashboard. It runs in-cluster, reads Crossplane
(and other) resources through a read-only ClusterRole, and keeps its own
session/user state in a bundled PostgreSQL database.

- **Auth**: native OIDC against Authentik (`crossview-oidc-provider`), local
  admin fallback via 1Password
- **RBAC**: chart ClusterRole is get/list/watch on everything — Crossview can
  read secrets cluster-wide (standard dashboard trade-off); it cannot mutate
- **Exposure**: Gateway API HTTPRoute on `main-gateway`,
  `crossview.gateway.services.apocrathia.com` — no direct port-forward needed

## Bootstrap order

1. Blueprint creates `crossview-oidc-provider` + the launchpad application
   (Platform section) on reconcile.
2. Copy the generated **client ID** and **client secret** from Authentik
   (Applications → Providers → crossview-oidc-provider) into the 1Password
   item `crossview-secrets` (vault `Secrets`).
3. The pod stays blocked on missing secret keys until the item exists —
   same pattern as other OIDC apps (see renovate-operator).

### 1Password item fields

| Field                | Used by                    |
| -------------------- | -------------------------- |
| `oidc-client-id`     | HelmRelease `valuesFrom`   |
| `admin-username`     | local admin fallback login |
| `oidc-client-secret` | OIDC env (secretKeyRef)    |
| `admin-password`     | local admin fallback login |
| `session-secret`     | session cookie signing     |
| `db-password`        | bundled PostgreSQL         |

## Troubleshooting

```bash
kubectl -n crossview get pods
kubectl -n crossview logs deploy/crossview
kubectl get httproute -n crossview crossview-httproute
kubectl -n crossview get secret crossview-secrets
```
