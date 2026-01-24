# Audiobookshelf

Self-hosted audiobook and podcast server with mobile app support and progress tracking.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Audiobook and podcast library management
- Progress sync across devices via mobile apps
- Multi-library organization
- Authentik OIDC authentication

## Access

- **URL**: `https://audiobookshelf.gateway.services.apocrathia.com`

## Configuration

All configuration is done through the web interface after deployment.

See `helmrelease.yaml` for complete deployment configuration.

## Authentication

Uses Authentik OIDC provider for SSO. Configure OpenID Connect in the application settings after deployment.

## Initial Setup

1. Access the web UI after deployment
2. Create your admin account (first user becomes admin)
3. Go to Settings → Authentication
4. Enable "OpenID Connect Authentication"
5. Configure OIDC settings:
   - **Issuer URL**: `https://auth.gateway.services.apocrathia.com/application/o/audiobookshelf/`
   - **Client ID/Secret**: From Authentik → Providers → audiobookshelf-oidc-provider
   - Click "Auto-populate" to fill discovery URLs
6. Add libraries pointing to `/audiobooks` and `/podcasts` mount paths

OIDC auto-redirect can be bypassed with `/login?autoLaunch=0` if needed.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n audiobookshelf

# Application logs
kubectl logs -n audiobookshelf deployment/audiobookshelf -f

# Check OIDC provider in Authentik
# Providers → audiobookshelf-oidc-provider
```

## References

- **[Official Documentation](https://www.audiobookshelf.org/docs)** - Primary documentation
- **[GitHub Repository](https://github.com/advplyr/audiobookshelf)** - Source code and issues
