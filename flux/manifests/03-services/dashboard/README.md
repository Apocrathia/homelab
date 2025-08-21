# Kubernetes Dashboard

The Kubernetes Dashboard provides a web-based UI for managing Kubernetes clusters.

## Access

The dashboard is accessible at: `https://dashboard.gateway.services.apocrathia.com`

## Authentication

The dashboard is protected by Authentik SSO. After authenticating through Authentik, you'll need to provide a Kubernetes ServiceAccount token to access the dashboard.

### Getting the Service Account Token

The dashboard automatically creates a ServiceAccount with appropriate permissions as part of the deployment, along with a token secret. To get the token:

```bash
# Copy the token to clipboard
kubectl -n kubernetes-dashboard create token kubernetes-dashboard-api | pbcopy
```

### Using the Token

1. Access the dashboard URL
2. Authenticate through Authentik when prompted
3. On the dashboard login screen, paste the token from your clipboard
4. Click "Sign In"

## Architecture

- **Frontend**: Dashboard web UI
- **Backend**: Dashboard API with Kong proxy
- **Authentication**: Authentik SSO + Kubernetes ServiceAccount tokens (auto-created)
- **Ingress**: Gateway API with Cilium

## Security

- The dashboard ServiceAccount has limited permissions (not cluster-admin)
- All external access goes through Authentik
- Kong acts as a reverse proxy with no additional authentication plugins

## Troubleshooting

If you encounter authentication issues:

1. Verify the dashboard pods are running: `kubectl get pods -n kubernetes-dashboard`
2. Check Kong logs: `kubectl logs -n kubernetes-dashboard deployment/kubernetes-dashboard-kong`
3. Ensure you're using a fresh token (tokens expire)
4. Verify Authentik is accessible at `https://auth.gateway.services.apocrathia.com`
