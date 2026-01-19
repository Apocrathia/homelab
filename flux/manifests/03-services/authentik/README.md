# Authentik

Open-source identity and access management solution with SSO, policy-based authorization, and GitOps-driven configuration.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

This deployment includes:

- **Single Sign-On**: SAML, OAuth2, OIDC, LDAP integration
- **User Management**: Multi-tenant user directory with policy-based access control
- **Application Integration**: Outpost-based application SSO
- **Blueprints**: GitOps-driven configuration management via ConfigMaps
- **PostgreSQL**: Primary database for user data and configuration
- **Longhorn**: Persistent storage for database

## Access

- **URL**: `https://auth.gateway.services.apocrathia.com`
- **API**: `https://authentik.authentik-system.svc:9443/api/v3/`

## Configuration

Configuration is managed through Authentik's blueprint system for GitOps-driven setup:

- **Blueprints**: ConfigMaps labeled with `authentik_blueprint: "true"` are automatically loaded
- **Sidecar Container**: `kiwigrid/k8s-sidecar` monitors and syncs blueprints from ConfigMaps
- **Auto-reload**: Configuration changes are automatically applied when blueprints are updated

See `helmrelease.yaml` for complete deployment configuration.

### Secrets

Create a 1Password item called `authentik-secrets` with the following fields:

- **Field Label**: `authentik-secret-key` | **Value**: `your-secure-secret-key`
- **Field Label**: `postgres-password` | **Value**: `your-postgres-password`

The 1Password Connect Operator will automatically create a Kubernetes secret with these values.

## Authentication

Authentik uses self-hosted authentication. The first user created on initial access becomes the admin user.

## Initial Setup

1. Access the web UI at `https://auth.gateway.services.apocrathia.com`
2. Create the first admin user account
3. Configure applications and policies through the admin interface or blueprints

## Troubleshooting

```bash
# Pod status
kubectl get pods -n authentik

# Server logs
kubectl logs -n authentik deployment/authentik-server -f

# Worker logs
kubectl logs -n authentik deployment/authentik-worker -f

# Check blueprint loading
kubectl logs -n authentik deployment/authentik-server -c sidecar-blueprints

# Verify blueprint ConfigMaps
kubectl get configmaps -n authentik -l authentik_blueprint=true

# Check database connectivity
kubectl get pods -n authentik -l app.kubernetes.io/name=postgresql

# Manual blueprint application (if auto-load fails)
kubectl exec -n authentik authentik-worker-<pod-id> -- python manage.py apply_blueprint /blueprints/<blueprint-name>.yaml
```

## References

- **[Authentik Documentation](https://docs.goauthentik.io/)** - Official documentation
- **[Blueprint System](https://docs.goauthentik.io/docs/customize/blueprints/)** - GitOps configuration guide
- **[OAuth2/OIDC](https://docs.goauthentik.io/docs/providers/oauth2/)** - OAuth2/OIDC provider setup
