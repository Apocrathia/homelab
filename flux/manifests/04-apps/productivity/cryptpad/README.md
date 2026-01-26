# CryptPad

End-to-end encrypted collaboration suite with real-time document editing.

> **Navigation**: [← Back to Productivity](../README.md)

## Links

- [Official Documentation](https://docs.cryptpad.org/)
- [GitHub Repository](https://github.com/cryptpad/cryptpad)

## Access

- **Main URL**: <https://cryptpad.gateway.services.apocrathia.com>
- **Sandbox URL**: <https://cryptpad-sandbox.gateway.services.apocrathia.com>

CryptPad requires two domains for its security model - the main domain handles authentication and keys, while the sandbox domain isolates user-generated content to protect against XSS attacks.

## Authentication

Uses Authentik proxy for the main domain. Users create CryptPad accounts after authenticating through Authentik.

## Storage

All data stored on NAS via SMB at `Library/CryptPad`. CryptPad uses file-based storage (no database) with subdirectories for documents, uploads, user blocks, and logs.

## Initial Setup

1. Access the main URL and authenticate via Authentik
2. Create a CryptPad account (register with username/password)
3. For admin access, copy your public signing key from Settings and add it to the ConfigMap's `adminKeys` array

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n cryptpad

# View logs
kubectl logs -n cryptpad deployment/cryptpad

# Check configuration
kubectl get configmap cryptpad-config -n cryptpad -o yaml

# Verify storage mount
kubectl exec -n cryptpad deployment/cryptpad -- ls -la /data
```

## References

- [CryptPad Admin Guide](https://docs.cryptpad.org/en/admin_guide/)
- [Configuration Reference](https://docs.cryptpad.org/en/admin_guide/customization.html)
