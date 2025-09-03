# Kuber - iOS Kubernetes Dashboard Token

This directory contains the deployment configuration for generating and managing a Kubernetes access token for the [Kuber iOS app](https://apps.apple.com/us/app/kuber-kubernetes-dashboard/id1461666739).

> **Navigation**: [← Back to Management README](../README.md)

## Overview

Kuber is a mobile Kubernetes dashboard app for iOS that allows you to manage Kubernetes clusters from your mobile device. This deployment creates a read-only service account token and automatically pushes it to 1Password for secure access from the iOS app.

### Key Features

- **Read-only Access**: Service account bound to cluster `view` role
- **Secure Token Management**: Token automatically synced to 1Password via External Secrets Operator
- **Mobile-friendly**: Designed for use with the Kuber iOS app
- **Automated Refresh**: Token automatically updated in 1Password every 24 hours

## Deployment

This deployment creates:

- **Namespace**: `kuber-ios` for isolation
- **Service Account**: `kuber-ios` with read-only cluster permissions
- **Token Secret**: Automatically populated by Kubernetes with bearer token
- **PushSecret**: External Secrets Operator pushes token to 1Password

### Configuration Details

- **Service Account**: `kuber-ios` in namespace `kuber-ios`
- **RBAC**: Bound to cluster `view` role (read-only access)
- **Token Secret**: `kuber-ios-token` of type `kubernetes.io/service-account-token`
- **1Password Item**: `kuber-ios-token` in `Secrets` vault
- **Refresh Interval**: 24 hours
- **Status**: ✅ Working - Token successfully synced to 1Password

## Usage

### Setting up Kuber iOS App

1. **Install Kuber**: Download from the [App Store](https://apps.apple.com/us/app/kuber-kubernetes-dashboard/id1461666739)

2. **Get Token from 1Password**:

   - Open 1Password on your iOS device
   - Navigate to vault `Secrets`
   - Find item `kuber-ios-token`
   - Copy the password field (this is your bearer token)

3. **Configure Kuber**:
   - Open Kuber app
   - Add new cluster
   - Select "Token" authentication method
   - Enter your cluster's API server URL
   - Paste the token from 1Password
   - Optionally add CA certificate if required

### Cluster Access

The service account has read-only access to:

- Pods, Deployments, Services
- ConfigMaps, Secrets (read-only)
- Nodes, PersistentVolumes
- Jobs, CronJobs
- And other cluster resources

**Note**: The token provides read-only access only. No write operations are permitted.

### Token Refresh Behavior

The token automatically refreshes every 24 hours for security:

- **Kubernetes**: Automatically generates a new token before expiration
- **PushSecret**: Pushes the updated token to 1Password every 24 hours
- **Usage**: When using Kuber, simply copy the latest token from the same 1Password item
- **No reconfiguration needed**: Just update the token field in Kuber with the fresh value

This ensures you always have a valid, recently-rotated token while maintaining security best practices.

## Security

### Token Management

- **Automatic Rotation**: Token is managed by Kubernetes and automatically refreshed
- **Secure Storage**: Token stored in 1Password, never in git repository
- **Minimal Permissions**: Read-only access via cluster `view` role
- **Encrypted Transit**: Token synced to 1Password via External Secrets Operator

### Access Control

The service account is bound to the cluster `view` role, which provides:

- Read access to most cluster resources
- No write, delete, or administrative permissions
- Safe for mobile device access

## Troubleshooting

### Token Not Appearing in 1Password

If the token isn't showing up in 1Password, check these components:

1. **Check PushSecret Status**:

   ```bash
   kubectl get pushsecret -n kuber-ios kuber-ios-token-to-1password
   kubectl describe pushsecret -n kuber-ios kuber-ios-token-to-1password
   ```

   - Status should show "Synced"
   - Look for "PushSecret synced successfully" in events

2. **Verify External Secrets Operator**:

   ```bash
   kubectl get pods -n external-secrets-system
   kubectl logs -n external-secrets-system deployment/external-secrets
   ```

3. **Check 1Password Connect**:

   ```bash
   kubectl get pods -n onepassword-system
   kubectl logs -n onepassword-system deployment/onepassword-connect
   ```

   - Look for successful POST operations (200 OK) in logs
   - 403 errors indicate permission issues with the 1Password token

4. **Verify 1Password Token Permissions**:
   - Ensure the 1Password Connect token has **write permissions** to the `Secrets` vault
   - If permissions were recently updated, you may need to create a new token

### Token Access Issues in Kuber App

1. **Verify Token Format**:

   - Ensure you're copying the entire token from 1Password
   - Token should be a long base64-encoded string

2. **Check API Server URL**:

   - Verify the cluster endpoint is accessible from your device
   - Ensure proper network connectivity (VPN, etc.)

3. **CA Certificate**:
   - If using self-signed certificates, you may need to add the CA cert
   - The CA certificate is available in the same Kubernetes secret

### Getting CA Certificate

```bash
# Extract CA certificate from the token secret
kubectl get secret -n kuber-ios kuber-ios-token -o jsonpath='{.data.ca\.crt}' | base64 -d
```

## Monitoring

### Check Token Secret

```bash
# View token secret details
kubectl get secret -n kuber-ios kuber-ios-token -o yaml

# Check if token is populated
kubectl get secret -n kuber-ios kuber-ios-token -o jsonpath='{.data.token}' | base64 -d | wc -c
```

### Monitor PushSecret

```bash
# Check PushSecret status
kubectl get pushsecret -n kuber-ios

# View PushSecret events
kubectl describe pushsecret -n kuber-ios kuber-ios-token-to-1password
```

## Resources

- [Kuber iOS App](https://apps.apple.com/us/app/kuber-kubernetes-dashboard/id1461666739)
- [External Secrets Operator](https://external-secrets.io/)
- [1Password Connect](https://developer.1password.com/docs/connect/)
- [Kubernetes Service Accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
