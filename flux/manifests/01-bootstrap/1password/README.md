# 1Password Connect Setup Guide

This guide explains how to set up the required credentials for deploying the 1Password Connect Operator in your Kubernetes cluster.

> **Navigation**: [← Back to Flux README](../../../README.md)

## Prerequisites

- Access to your 1Password account with administrative privileges
- 1Password CLI installed locally (`op` command)
- `kubectl` configured with access to your cluster

## Required Credentials

The 1Password Connect Operator requires two main credentials:

1. **1Password Connect Credentials File** (`1password-credentials.json`)
2. **Connect API Token**

### Step 1: Create 1Password Connect Credentials

1. Sign in to your 1Password account at [1password.com](https://1password.com)
2. Go to Integrations → Connect Server → New Connect Server
3. Give your Connect Server a name (e.g., "Homelab K8s")
4. Click "Create Credentials" and save the `1password-credentials.json` file
5. Base64 encode the credentials file:
   ```bash
   cat 1password-credentials.json | base64 | tr '/+' '_-' | tr -d '=' | tr -d '\n' > 1password-credentials.b64
   ```
6. Create a Kubernetes secret with the encoded credentials:
   ```bash
   kubectl create secret generic 1password-credentials \
     --namespace=onepassword-system \
     --from-file=1password-credentials.json=../secrets/1password-credentials.b64
   ```
7. Securely store the original `1password-credentials.json` in 1Password and delete local copies

### Step 2: Generate Connect API Token

1. In the same Connect Server settings page:
2. Click "Create Access Token"
3. Give the token a name (e.g., "Homelab K8s Operator")
4. Save the token securely - it will only be shown once
5. Create a Kubernetes secret with the token:
   ```bash
   kubectl create secret generic 1password-token \
     --namespace=onepassword-system \
     --from-literal=token=$(/bin/cat ../secrets/1password-token)
   ```

## Security Considerations

- Store the original `1password-credentials.json` file securely in 1Password
- Delete all local copies of `1password-credentials.json` and `1password-credentials.b64` after creating the Kubernetes secret
- The Connect API token should be treated as a sensitive secret and stored in 1Password
- Both secrets should be backed up securely outside the cluster
- Consider using a dedicated vault in 1Password for Kubernetes secrets
- Review and limit the access scope of the Connect Server in 1Password settings
- Regularly rotate the Connect API token
- Monitor access logs for unusual activity

## Verification

To verify the credentials are working:

```bash
# Check if secrets exist
kubectl get secrets -n 1password op-credentials onepassword-token

# Check operator logs
kubectl logs -n 1password deployment/onepassword-connect-operator

# Check connect API logs
kubectl logs -n 1password deployment/onepassword-connect
```

## Troubleshooting

Common issues and solutions:

1. **Operator CrashLoopBackOff**

   - Verify the token secret exists and is correctly formatted
   - Check operator logs for specific errors
   - Ensure the credentials file was properly base64 encoded

2. **Connect API CrashLoopBackOff**

   - Verify the credentials secret exists and is correctly base64 encoded
   - Check connect API logs for specific errors
   - Verify the credentials file format wasn't corrupted during encoding

3. **Authentication Errors**
   - Ensure the credentials file is valid and properly encoded
   - Verify the token has the correct permissions in 1Password
   - Check if the token has expired or been revoked

## Additional Resources

- [Official 1Password Connect Documentation](https://developer.1password.com/docs/connect)
- [Helm Chart Configuration Options](https://developer.1password.com/docs/connect/helm)
- [Kubernetes Operator Documentation](https://developer.1password.com/docs/k8s/k8s-operator)
