# Renovate Operator

Kubernetes operator that runs Renovate as per-project Jobs driven by `RenovateJob` custom resources.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

This deployment includes:

- The mogenius renovate-operator and its `RenovateJob` CRD
- The `RenovateJob` (`homelab`) that discovers `Apocrathia/*` on GitLab daily
  at 03:00 and runs one executor Job per project
- Web UI exposed via Gateway with Authentik OIDC authentication
- 1Password-managed platform and OIDC credentials via `renovate-operator-secret`

This operator is the only Renovate bot on the group. Mend Renovate CE (former
`renovate` namespace) was retired at cutover; never run two bots against the
same repositories.

## Access

- **URL**: `https://renovate.gateway.services.apocrathia.com`

## Configuration

Configuration lives in two places:

- `helmrelease.yaml` - operator deployment, UI routing, and OIDC (chart values)
- `config/renovatejob.yaml` - schedule, discovery filter, Renovate image, and
  global Renovate config for the Jobs the operator spawns

`config/` is a separate Flux Kustomization (`services-renovate-operator-config`)
that depends on the operator one: the chart installs the `RenovateJob` CRD, so
CRs must not apply before the chart's CRD hook completes. Applying both from
one Kustomization deadlocks - the CR's dry-run failure aborts the apply before
the HelmRelease is ever created.

Renovate behavior for processed repositories still comes from `renovate.json`
in each target repository.

### Secrets

The deployment reads `renovate-operator-secret`, synced from the existing
`renovate-secrets` 1Password item. Required fields:

- `RENOVATE_TOKEN` - GitLab PAT for platform access (same value as `gitlab-token`)
- `GITHUB_COM_TOKEN` - GitHub token for changelogs (same value as `github-token`)
- `oidc-client-id` - Authentik OIDC client ID (copy from the provider after the
  blueprint applies)
- `oidc-client-secret` - Authentik OIDC client secret (same source)
- `oidc-session-secret` - random string for UI session encryption (generate once)

## Authentication

Web UI uses native OIDC against Authentik (confidential client, PKCE). The
`authentik-blueprint.yaml` ConfigMap creates the provider and application.
Membership in the `kubernetes-admins` Authentik group grants admin access to
RenovateJobs; there is no anonymous or reader access. Never expose the UI
route without OIDC configured - the operator serves it unauthenticated
otherwise.

## Troubleshooting

```bash
# Operator status and logs
kubectl get pods -n renovate-operator
kubectl logs -n renovate-operator deployment/renovate-operator -f

# Job state and discovered projects
kubectl get renovatejobs -n renovate-operator
kubectl describe renovatejob homelab -n renovate-operator

# Discovery and executor Jobs the operator spawns
kubectl get jobs -n renovate-operator

# UI route
kubectl get httproute -n renovate-operator
```

## References

- **[renovate-operator documentation](https://github.com/mogenius/renovate-operator)** - Source, CRD schema, and Helm chart
- **[Renovate documentation](https://docs.renovatebot.com/)** - Renovate configuration reference
- **[Renovate CE](../renovate/README.md)** - Retired predecessor deployment (kept for reference during cutover validation)
