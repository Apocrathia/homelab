# Kubernetes Dashboard

The Kubernetes Dashboard provides a web-based UI for managing Kubernetes clusters.

> **Navigation**: [← Back to Services README](../README.md)

## Documentation

- **[Kubernetes Dashboard Documentation](https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/)** - Primary documentation source
- **[GitHub Repository](https://github.com/kubernetes/dashboard)** - Source code and issues

## Access

The dashboard is accessible at: `https://dashboard.gateway.services.apocrathia.com`

## Authentication

The dashboard is protected by Authentik SSO. After authenticating through Authentik, you'll need to provide a Kubernetes ServiceAccount token to access the dashboard.

### Getting the Service Account Token

The dashboard now uses a secure token management system that automatically syncs tokens to 1Password:

1. **Get Token from 1Password**:

   - Open 1Password on your device
   - Navigate to vault `Secrets`
   - Find item `kubernetes-admin-token`
   - Copy the password field (this is your bearer token)

2. **Alternative: Generate Token Manually**:
   ```bash
   # Copy the token to clipboard
   kubectl -n kubernetes-dashboard create token kubernetes-admin-token | pbcopy
   ```

### Using the Token

1. Access the dashboard URL
2. Authenticate through Authentik when prompted
3. On the dashboard login screen, paste the token from 1Password (or clipboard)
4. Click "Sign In"

### Token Refresh

The token automatically refreshes every 24 hours for security:

- **Kubernetes**: Automatically generates a new token before expiration
- **PushSecret**: Pushes the updated token to 1Password every 24 hours
- **Usage**: Simply copy the latest token from the same 1Password item when needed

## Architecture

- **Frontend**: Dashboard web UI
- **Backend**: Dashboard API with Kong proxy
- **Authentication**: Authentik SSO + Kubernetes ServiceAccount tokens (auto-created)
- **Ingress**: Gateway API with Cilium

## Security

- **Admin Access**: The dashboard ServiceAccount has cluster-admin permissions
- **Token Management**: Tokens are automatically rotated every 24 hours and synced to 1Password
- **Secure Storage**: Tokens stored in 1Password, never in git repository
- **External Access**: All external access goes through Authentik SSO
- **Reverse Proxy**: Kong acts as a reverse proxy with no additional authentication plugins

## Troubleshooting

If you encounter authentication issues:

1. Verify the dashboard pods are running: `kubectl get pods -n kubernetes-dashboard`
2. Check Kong logs: `kubectl logs -n kubernetes-dashboard deployment/kubernetes-dashboard-kong`
3. Ensure you're using a fresh token (tokens expire)
4. Verify Authentik is accessible at `https://auth.gateway.services.apocrathia.com`
