# Ideon

Self-hosted visual workspace for project management with spatial organization, real-time collaboration, and state history tracking.

> **Navigation**: [← Back to Productivity README](../README.md)

## Overview

This deployment includes:

- PostgreSQL database via CloudNativePG
- Persistent storage for avatars, uploads, and collaboration data
- Authentik OIDC integration

## Access

- **URL**: `https://ideon.gateway.services.apocrathia.com`

## Configuration

Web UI handles all configuration after deployment. Authentication providers (OIDC, Google, Slack, Discord, GitLab, SAML) can be configured through the management interface.

See `helmrelease.yaml` for complete deployment configuration.

### Secrets

Create a 1Password item at `vaults/Secrets/items/ideon-secrets` with:

- `username` - PostgreSQL username
- `password` - PostgreSQL password
- `secret-key` - Master key for session signing and encryption (generate with `openssl rand -hex 32`)

## Authentication

Uses Authentik OIDC provider. Configure in Ideon's management interface:

- **Issuer**: `https://auth.gateway.services.apocrathia.com/application/o/ideon/`
- **Client ID/Secret**: From Authentik provider `ideon-oidc-provider`

## Initial Setup

1. Access the web UI and create first account (becomes admin)
2. In Authentik, get client credentials from `ideon-oidc-provider`
3. Configure OIDC provider in Ideon's management interface

## Troubleshooting

```bash
# Pod status
kubectl get pods -n ideon

# Application logs
kubectl logs -n ideon deployment/ideon -f

# Database cluster status
kubectl get cluster -n ideon
```

## References

- **[GitHub Repository](https://github.com/3xpyth0n/ideon)** - Source code and issues
- **[DeepWiki](https://deepwiki.com/3xpyth0n/ideon)** - Generated documentation
