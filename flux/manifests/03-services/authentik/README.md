# Authentik - Identity and Access Management

Open-source identity and access management solution with SSO, policy-based authorization, and GitOps-driven configuration.

> **Navigation**: [← Back to Services README](../README.md)

## Documentation

- **[Authentik Documentation](https://docs.goauthentik.io/)** - Official documentation
- **[Blueprint System](https://docs.goauthentik.io/docs/customize/blueprints/)** - GitOps configuration
- **[OAuth2/OIDC](https://docs.goauthentik.io/docs/providers/oauth2/)** - OAuth2/OIDC provider setup

## Overview

Authentik provides comprehensive identity and access management with:

- **Single Sign-On**: SAML, OAuth2, OIDC, LDAP integration
- **User Management**: Multi-tenant user directory
- **Access Control**: Policy-based authorization
- **Application Integration**: Outpost-based application integration
- **Blueprints**: GitOps-driven configuration management

## Architecture

### Core Components

#### Authentik Server

- **Web Interface**: Admin and user-facing web UI
- **API Server**: REST API for configuration and management
- **Authentication**: Core authentication and authorization engine
- **Policy Engine**: Advanced policy-based access control

#### Authentik Worker

- **Background Tasks**: Certificate management, cleanup tasks
- **Notification Processing**: Email and notification handling
- **Event Processing**: Event-driven automation
- **Source Sync**: External source synchronization

#### PostgreSQL Database

- **User Data**: User accounts, groups, and permissions
- **Configuration**: Application and policy configuration
- **Audit Logs**: Authentication and authorization events
- **Session Data**: User session management

### Outpost System

#### Authentication Outpost

- **SSO Integration**: Application SSO through reverse proxy
- **Authentication**: Form-based and token-based auth
- **Authorization**: Policy-based access control
- **Session Management**: Distributed session handling

#### LDAP Outpost

- **Directory Service**: LDAP protocol support
- **User Lookup**: LDAP-based user authentication
- **Group Mapping**: LDAP group to Authentik group mapping
- **Legacy Integration**: Support for legacy LDAP clients

## 1Password Setup

Before deploying Authentik, create the secrets in 1Password:

1. In your 1Password vault, create a new item called `authentik-secrets`
2. Add these fields:
   - **Field Label**: `authentik-secret-key` | **Value**: `your-secure-secret-key`
   - **Field Label**: `postgres-password` | **Value**: `your-postgres-password`

The 1Password Connect Operator will automatically create a Kubernetes secret with these values.

## Features

### Authentication Methods

- **Password Authentication**: Username/password with complexity requirements
- **Social Login**: Google, GitHub, GitLab, Microsoft, etc.
- **Certificate Authentication**: X.509 client certificate authentication
- **TOTP/HOTP**: Time-based and counter-based one-time passwords
- **WebAuthn**: FIDO2/WebAuthn support for passwordless authentication

### Authorization Features

- **Role-Based Access Control**: Hierarchical role system
- **Policy Engine**: Expression-based policy system
- **Group Management**: Nested group hierarchies
- **Permission System**: Granular permission management

### Integration Capabilities

- **SAML Integration**: SAML 2.0 service provider support
- **OAuth2/OIDC**: Full OAuth2 and OpenID Connect support
- **LDAP Integration**: LDAP client and server support
- **SCIM**: System for Cross-domain Identity Management
- **Radius**: RADIUS protocol support

## Configuration

### Blueprints System

Authentik uses a blueprint system for GitOps-driven configuration:

#### Application Blueprints

- **Authentik Blueprints**: Located in `blueprints/` directory
- **Application Definitions**: OAuth2/OIDC application configurations
- **Policy Definitions**: Authorization policies and rules
- **Source Configurations**: External identity source definitions

#### Blueprint Loading

- **Sidecar Container**: `kiwigrid/k8s-sidecar` loads blueprints
- **ConfigMap Selection**: Blueprints labeled with `authentik_blueprint: "true"`
- **Auto-reload**: Configuration changes automatically applied
- **Version Control**: Blueprints stored in Git for version control

### Resource Requirements

Resource limits and requests are configured in `helmrelease.yaml`.

## Access and Usage

### Admin Interface

- **URL**: `https://auth.gateway.services.apocrathia.com`
- **Authentication**: SSO through Authentik itself
- **Initial Setup**: Create first admin user on first access
- **RBAC**: Role-based access to admin functions

### API Access

- **REST API**: `https://authentik.authentik-system.svc:9443/api/v3/`
- **OpenAPI Spec**: Available at `/api/v3/schema/`
- **Token Authentication**: API token-based authentication
- **Rate Limiting**: Configurable API rate limits

### Integration Examples

#### OAuth2 Application

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: oauth2-app-blueprint
  labels:
    authentik_blueprint: "true"
data:
  blueprint.yaml: |
    model: authentik_providers_oauth2.oauth2provider
    attrs:
      name: "My Application"
      client_id: "my-app"
      client_secret: "secret"
      redirect_uris:
        - "https://myapp.example.com/auth/callback"
```

#### Authorization Policy

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: auth-policy-blueprint
  labels:
    authentik_blueprint: "true"
data:
  blueprint.yaml: |
    model: authentik_policies_expression.expressionpolicy
    attrs:
      name: "Admin Only"
      expression: |
        return request.user.is_superuser
```

## Integration with Homelab

### Gateway API Integration

- **HTTPRoute Configuration**: Gateway API routing for Authentik
- **TLS Termination**: Certificate management through cert-manager
- **Load Balancing**: Cilium-based load balancing
- **Security Headers**: Security headers and middleware

### Application Integration

- **Outpost Deployment**: Authentik outposts for application SSO
- **Automatic Configuration**: Blueprint-driven application setup
- **User Provisioning**: Automated user account creation
- **Group Synchronization**: Group membership synchronization

### Monitoring Integration

- **Metrics Collection**: Prometheus metrics for Authentik components
- **Dashboard Integration**: Grafana dashboards for Authentik monitoring
- **Alert Configuration**: Alert rules for Authentik health
- **Audit Logging**: Comprehensive audit trail integration

### Storage Integration

- **PostgreSQL**: Primary database for user and configuration data
- **Redis**: Session storage and caching
- **Longhorn**: Persistent storage for database and configuration
- **Backup**: Automated backup through Longhorn

## Security Considerations

### Authentication Security

- **Password Policies**: Configurable password complexity requirements
- **MFA Enforcement**: Multi-factor authentication policies
- **Session Management**: Configurable session timeouts
- **Brute Force Protection**: Account lockout and rate limiting

### Network Security

- **TLS Encryption**: End-to-end encryption for all communications
- **Network Policies**: Kubernetes network policies for traffic control
- **API Security**: API token management and rotation
- **Audit Logging**: Comprehensive security event logging

### Data Protection

- **Encryption**: Data encryption at rest and in transit
- **Backup Security**: Secure backup of sensitive data
- **Access Control**: Principle of least privilege
- **Compliance**: Security and compliance monitoring

## Troubleshooting

### Common Issues

1. **Blueprint Loading Issues**

   ```bash
   # Check sidecar logs
   kubectl logs -n authentik deployment/authentik-server -c sidecar-blueprints

   # Verify blueprint labels
   kubectl get configmaps -n authentik -l authentik_blueprint=true
   ```

2. **Database Connection Issues**

   ```bash
   # Check PostgreSQL status
   kubectl get pods -n authentik -l app.kubernetes.io/name=postgresql

   # Check connection logs
   kubectl logs -n authentik deployment/authentik-server
   ```

3. **Outpost Communication Issues**

   ```bash
   # Check outpost logs
   kubectl logs -n authentik deployment/authentik-outpost

   # Verify network connectivity
   kubectl exec -n authentik deployment/authentik-outpost -- curl -f http://authentik-server:8080
   ```

### Health Checks

```bash
# Check Authentik components
kubectl get pods -n authentik

# Check API health
kubectl exec -n authentik deployment/authentik-server -- curl -f http://localhost:8080/-/health/ready/

# Check database connectivity
kubectl exec -n authentik deployment/authentik-server -- python -c "import psycopg2; psycopg2.connect(...)"
```

### Log Analysis

```bash
# Server logs
kubectl logs -n authentik deployment/authentik-server

# Worker logs
kubectl logs -n authentik deployment/authentik-worker

# PostgreSQL logs
kubectl logs -n authentik deployment/authentik-postgresql
```

### Blueprint Loading Issues

#### Manual Blueprint Application

When blueprints fail to load automatically or you need to apply them manually for debugging, use the Django management command on the worker pod:

```bash
# Find the worker pod
kubectl get pods -n authentik -l app.kubernetes.io/component=worker

# Apply a specific blueprint
kubectl exec -n authentik authentik-worker-<pod-id> -- python manage.py apply_blueprint /blueprints/<blueprint-name>.yaml
```

**Script Location**: `/authentik/blueprints/management/commands/apply_blueprint.py`

This script provides detailed error output that can help diagnose blueprint issues:

- Validates blueprint syntax and structure
- Shows specific error messages for failed imports
- Applies blueprints in the correct order
- Exits with error code 1 if validation fails

**Available Blueprints**: Blueprints are synced to `/blueprints/` via the sidecar container and can be listed with:

```bash
kubectl exec -n authentik authentik-worker-<pod-id> -- ls -la /blueprints/
```

## Best Practices

### Configuration Management

1. **Blueprint Usage**: Use blueprints for all configuration
2. **Version Control**: Store blueprints in Git
3. **Testing**: Test configuration changes in development
4. **Documentation**: Document custom policies and integrations

### Security

1. **MFA Enforcement**: Require MFA for all users
2. **Password Policies**: Implement strong password requirements
3. **Session Management**: Configure appropriate session timeouts
4. **Audit Logging**: Enable comprehensive audit logging

### Operations

1. **Backup Strategy**: Regular backup of database and configuration
2. **Monitoring**: Monitor Authentik health and performance
3. **Updates**: Keep Authentik updated with security patches
4. **Scaling**: Monitor resource usage and scale appropriately
