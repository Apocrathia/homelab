# Policy Reporter

Monitoring and observability tool for PolicyReport CRDs with an optional UI.

> **Navigation**: [← Back to Kyverno README](../README.md)

## Overview

Policy Reporter watches for PolicyReport resources from policy engines like Kyverno and Trivy. It provides:

- **Metrics**: Prometheus metrics for policy violations and compliance
- **UI**: Web interface for viewing policy reports and violations
- **Kyverno Plugin**: Enhanced reporting for Kyverno policies

## Access

- **URL**: `https://kyverno.gateway.services.apocrathia.com`

## Authentication

Policy Reporter UI uses OIDC authentication via Authentik. The OIDC provider is configured through an Authentik blueprint and credentials are stored in 1Password.

### 1Password Secret

Create a 1Password item at path `vaults/Secrets/items/kyverno-secrets` with the following fields:

- `oidc-client-id`: OIDC client ID from Authentik
- `oidc-client-secret`: OIDC client secret from Authentik

## Configuration

See `helmrelease.yaml` for complete deployment configuration.

This deployment includes:

- UI component enabled
- Kyverno plugin enabled
- Prometheus metrics enabled
- Gateway API HTTPRoute for external access

## Metrics

Policy Reporter exposes Prometheus metrics on the `/metrics` endpoint. Metrics are automatically scraped by Prometheus when ServiceMonitor is configured.

## Troubleshooting

```bash
# Check policy-reporter pods
kubectl get pods -n policy-reporter

# View policy-reporter logs
kubectl logs -n policy-reporter -l app.kubernetes.io/name=policy-reporter -f

# View UI logs
kubectl logs -n policy-reporter -l app.kubernetes.io/name=policy-reporter-ui -f

# View Kyverno plugin logs
kubectl logs -n policy-reporter -l app.kubernetes.io/name=policy-reporter-kyverno-plugin -f

# Check policy reports
kubectl get policyreport --all-namespaces

# Check HTTPRoute
kubectl get httproute -n policy-reporter
```

## References

- **[Policy Reporter Documentation](https://kyverno.github.io/policy-reporter-docs/)** - Primary documentation source
- **[GitHub Repository](https://github.com/kyverno/policy-reporter)** - Source code and issues
