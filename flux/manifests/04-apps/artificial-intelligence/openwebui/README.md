# OpenWebUI

User-friendly web interface for interacting with Large Language Models (LLMs) through chat interfaces.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Documentation

- **[OpenWebUI Official Documentation](https://docs.openwebui.com)** - Primary documentation source
- **[OpenWebUI GitHub Repository](https://github.com/open-webui/open-webui)** - Source code and issues
- **[OpenWebUI Helm Chart](https://github.com/open-webui/helm-charts)** - Deployment configuration
- **[Environment Variables Reference](https://docs.openwebui.com/getting-started/env-configuration)** - Configuration options
- **[OpenWebUI SSO/Authentication Guide](https://docs.openwebui.com/features/sso)** - Authentication setup
- **[Authentik Homepage](https://goauthentik.io)** - Authentication provider

## Overview

This deployment includes:

- OpenWebUI application with web interface
- Authentik integration for authentication
- Longhorn persistent storage
- Authentik-managed secure access
- MCPO (MCP-to-OpenAPI) bridge for MCP server integration

## Configuration

### Environment Variables

These environment variables configure OpenWebUI's behavior:

- **`WEBUI_URL`**: `https://chat.gateway.services.apocrathia.com`
  - **Description**: External URL where OpenWebUI is accessible
  - **Purpose**: Required for OAuth/SSO functionality and proper redirects

**Note**: Trusted header authentication is configured through the helm chart's `sso.trustedHeader` section, which automatically sets the required environment variables. The corresponding headers are sent by authentik's proxy provider through the `additional_headers` configuration in the authentik blueprint.

### Storage

- **Persistent Storage**: Longhorn volume for application data

### Access

- **External URL**: `https://chat.gateway.services.apocrathia.com`
- **Internal Service**: `http://openwebui.openwebui.svc.cluster.local:8080`

## Authentication

OpenWebUI uses a trusted header authentication mechanism with authentik:

1. **User Access**: User accesses `https://chat.gateway.services.apocrathia.com`
2. **Authentik Proxy**: authentik's outpost intercepts the request and handles authentication
3. **Header Injection**: Upon successful authentication, authentik injects trusted headers:
   - `X-Forwarded-Email`: User's email address
   - `X-Forwarded-User`: User's display name
4. **OpenWebUI Processing**: OpenWebUI reads these headers and creates/authenticates the user

## Security Considerations

- **SSO Integration**: Complete SSO authentication through authentik
- **Trusted Header Authentication**: Secure header-based authentication mechanism
- **Root Security Context Required**: OpenWebUI requires root privileges for proper operation
  - **Primary Source**: [OpenWebUI Dockerfile](https://github.com/open-webui/open-webui/blob/main/Dockerfile#L37) - explicitly states "Override at your own risk - non-root configurations are untested"
  - **Supporting Evidence**: [GitHub Issue #16813](https://github.com/open-webui/open-webui/issues/16813) - documents permission errors when running as non-root user
- **Read-only Root Filesystem**: Disabled for compatibility with OpenWebUI's requirements

## Troubleshooting

### Common Issues

1. **Authentication Issues**

   ```bash
   # Check Authentik outpost status
   kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost

   # View OpenWebUI logs
   kubectl -n openwebui logs -l app.kubernetes.io/name=openwebui
   ```

2. **Permission Issues**

   ```bash
   # Check pod security context
   kubectl -n openwebui describe pod -l app.kubernetes.io/name=openwebui

   # Verify root filesystem settings
   kubectl -n openwebui get pod -l app.kubernetes.io/name=openwebui -o yaml | grep -A 5 securityContext
   ```

### Health Checks

```bash
# Overall status
kubectl -n openwebui get pods,svc,pvc

# OpenWebUI application status
kubectl -n openwebui get pods -l app.kubernetes.io/name=openwebui

# Authentik outpost status
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost
```
