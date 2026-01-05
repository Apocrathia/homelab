# [Application Name]

[Brief description - 1-2 sentences explaining what the application does and its purpose in the homelab.]

> **Navigation**: [← Back to [Category] README](../README.md)

## Documentation

- **[Official Documentation](https://example.com/docs)** - Primary documentation source
- **[GitHub Repository](https://github.com/example/repo)** - Source code and issues

## Overview

This deployment includes:

- [Key feature 1]
- [Key feature 2]
- [Integration details - e.g., Authentik SSO, Longhorn storage]

## Access

- **URL**: `https://[app-name].gateway.services.apocrathia.com`

## Configuration

[Describe configuration METHOD, not tunable values]

- **Web UI**: All configuration done through web interface after deployment
- OR **Environment Variables**: Required env vars configured in helmrelease
- OR **Config Files**: Application generates config on first run

See `helmrelease.yaml` for complete deployment configuration.

### Secrets

[Only include if secrets are REQUIRED for startup - omit entire section if not needed]

Create a 1Password item at path specified in helmrelease.yaml with required fields.

## Authentication

[Brief description of auth approach]

Uses Authentik [proxy/OIDC] provider for SSO.

## Initial Setup

[Only if web UI or manual setup is required after deployment]

1. Access the web UI
2. [Setup step]
3. [Setup step]

## Troubleshooting

```bash
# Pod status
kubectl get pods -n [namespace]

# Application logs
kubectl logs -n [namespace] deployment/[app-name] -f

# Check Authentik outpost (if using SSO)
kubectl get pods -n authentik | grep [app-name]
```
