# OpenWebUI

OpenWebUI is a user-friendly web interface for interacting with Large Language Models (LLMs) through chat interfaces.

## Documentation

- **OpenWebUI Official Documentation**: <https://docs.openwebui.com>
- **OpenWebUI GitHub Repository**: <https://github.com/open-webui/open-webui>
- **OpenWebUI Helm Chart**: <https://github.com/open-webui/helm-charts>
- **Environment Variables Reference**: <https://docs.openwebui.com/getting-started/env-configuration>
- **OpenWebUI SSO/Authentication Guide**: <https://docs.openwebui.com/features/sso>
- **OpenWebUI Troubleshooting**: <https://docs.openwebui.com/troubleshooting/sso>
- **Authentik Homepage**: <https://goauthentik.io>

## Overview

This deployment includes:

- OpenWebUI application with web interface
- Authentik integration for authentication
- Longhorn persistent storage
- Authentik-managed secure access

### Environment Variables

These environment variables configure OpenWebUI's behavior.

**Documentation**: [OpenWebUI Environment Configuration](https://docs.openwebui.com/getting-started/env-configuration)

- **`WEBUI_URL`**: `https://chat.gateway.services.apocrathia.com`
  - **Description**: External URL where OpenWebUI is accessible
  - **Purpose**: Required for OAuth/SSO functionality and proper redirects

**Note**: Trusted header authentication is configured through the helm chart's `sso.trustedHeader` section, which automatically sets the required environment variables. The corresponding headers are sent by authentik's proxy provider through the `additional_headers` configuration in the authentik blueprint.

## Authentication Flow

OpenWebUI uses a trusted header authentication mechanism with authentik:

1. **User Access**: User accesses `https://chat.gateway.services.apocrathia.com`
2. **Authentik Proxy**: authentik's outpost intercepts the request and handles authentication
   - [Authentik Outpost Documentation](https://goauthentik.io/docs/outposts/)
   - [Proxy Provider Configuration](https://goauthentik.io/docs/providers/proxy/)
3. **Header Injection**: Upon successful authentication, authentik injects trusted headers:
   - `X-Forwarded-Email`: User's email address
   - `X-Forwarded-User`: User's display name
   - [Authentik Header Configuration](https://goauthentik.io/docs/providers/proxy/#additional-headers)
4. **OpenWebUI Processing**: OpenWebUI reads these headers and creates/authenticates the user
   - [OpenWebUI SSO/Authentication Guide](https://docs.openwebui.com/features/sso)
   - [OpenWebUI Environment Variables](https://docs.openwebui.com/getting-started/env-configuration)

## Security Considerations

- **SSO Integration**: Complete SSO authentication through authentik
  - [OpenWebUI SSO/Authentication Guide](https://docs.openwebui.com/features/sso)
- **Trusted Header Authentication**: Secure header-based authentication mechanism
  - [OpenWebUI Troubleshooting SSO](https://docs.openwebui.com/troubleshooting/sso)
- **Root Security Context Required**: OpenWebUI requires root privileges for proper operation
  - **Primary Source**: [OpenWebUI Dockerfile](https://github.com/open-webui/open-webui/blob/main/Dockerfile#L37) - explicitly states "Override at your own risk - non-root configurations are untested"
  - **Supporting Evidence**: [GitHub Issue #16813](https://github.com/open-webui/open-webui/issues/16813) - documents permission errors when running as non-root user
  - **Error Pattern**: Permission denied errors for static files and application resources when using `runAsNonRoot: true`
- **Read-only Root Filesystem**: Disabled for compatibility with OpenWebUI's requirements
  - [OpenWebUI Storage Requirements](https://docs.openwebui.com/getting-started/installation)
