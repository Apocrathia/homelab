# Lemmy

Self-hosted Lemmy UI frontend connected to the [lemmy.ml](https://lemmy.ml) instance.

> **Navigation**: [← Back to Social](../README.md)

## Overview

This deployment runs the [Lemmy UI](https://github.com/LemmyNet/lemmy-ui) web frontend, configured to point at the public lemmy.ml backend. No local Lemmy backend or database is deployed — this is a pure UI proxy to the external instance.

- Authentik proxy for SSO-gated access
- Stateless deployment (no persistent storage)

## Access

- **URL**: `https://lemmy.gateway.services.apocrathia.com`

## Configuration

The UI connects to lemmy.ml via `LEMMY_UI_LEMMY_INTERNAL_HOST` (server-side rendering) and `LEMMY_UI_LEMMY_EXTERNAL_HOST` (client-side API calls). Both are set to `lemmy.ml` with HTTPS enabled.

See `helmrelease.yaml` for complete deployment configuration.

## Authentication

Uses Authentik proxy provider for access control. Lemmy account authentication happens through the lemmy.ml instance itself after passing through Authentik.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n lemmy

# Application logs
kubectl logs -n lemmy deployment/lemmy -f

# Check Authentik outpost
kubectl get pods -n authentik | grep lemmy
```

## References

- **[Lemmy UI Repository](https://github.com/LemmyNet/lemmy-ui)** - Source code
- **[Lemmy Documentation](https://join-lemmy.org/docs/)** - Official docs
- **[lemmy.ml](https://lemmy.ml)** - Connected Lemmy instance
