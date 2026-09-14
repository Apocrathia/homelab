# CryptPad

End-to-end encrypted collaboration suite with real-time document editing.

> **Navigation**: [← Back to Productivity](../README.md)

## Links

- [Official Documentation](https://docs.cryptpad.org/)
- [GitHub Repository](https://github.com/cryptpad/cryptpad)

## Access

- **Main URL**: <https://cryptpad.gateway.services.apocrathia.com>
- **Sandbox URL**: <https://cryptpad-sandbox.gateway.services.apocrathia.com>

CryptPad requires two domains for its security model - the main domain handles authentication and keys, while the sandbox domain isolates user-generated content to protect against XSS attacks. Both hostnames are routed to `main-gateway` and `tailnet-gateway` (friends tier).

Guest pads are reachable without an account on both doors.

## Authentication

Native OIDC SSO via the official [cryptpad/sso](https://github.com/cryptpad/sso) plugin (pinned release, fetched by an initContainer into `/cryptpad/lib/plugins/sso`) with Authentik as the IdP. The chart's blueprint creates the OAuth2 provider and application; access is bound to the `admins` and `users` Authentik groups.

Registration is SSO-only (`enforced: true` in `sso.js`); existing pre-SSO local accounts can still log in until deleted. First SSO login creates a new CryptPad account (SSO identity is separate; there is no account linking).

The SSO plugin version must pair with the CryptPad image tag (currently plugin 0.6.0 ↔ image 2026.5.1); check the plugin releases before bumping either.

## Storage

All data stored on NAS via SMB at `Library/CryptPad`. CryptPad uses file-based storage (no database) with subdirectories for documents, uploads, user blocks, and logs. SSO user mappings live under `/data/sso_user` and `/data/sso_block`.

## Initial Setup

1. The `cryptpad-secrets` 1Password item (`vaults/Secrets/items/cryptpad-secrets`) provides `oidc-client-id` / `oidc-client-secret`; the same values feed the Authentik provider blueprint via `valuesFrom` and the pod env via `secretKeyRef`. The HelmRelease waits for the synced Secret on first apply.
2. Log in via the Authentik button on the CryptPad login page.
3. For admin access, copy your public signing key from Settings and add it to the ConfigMap's `adminKeys` array, then restart the deployment (config changes do not roll pods automatically).

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n cryptpad

# View logs
kubectl logs -n cryptpad deployment/cryptpad

# Check configuration
kubectl get configmap cryptpad-config cryptpad-sso-config -n cryptpad -o yaml

# Verify storage mount
kubectl exec -n cryptpad deployment/cryptpad -- ls -la /data

# Verify the SSO plugin landed (should list client/ protocols/ etc.)
kubectl exec -n cryptpad deployment/cryptpad -- ls /cryptpad/lib/plugins/sso
```

- **SSO button missing**: plugin files missing - check the `install-sso-plugin` initContainer logs (`INVALID_SERVER_CONFIG` in app logs means the OIDC env vars are empty, i.e. the Secret is not synced).
- **Stale UI after config edits**: config.js/sso.js edits need `kubectl -n cryptpad rollout restart deployment/cryptpad` (no checksum-based rollouts in the chart), then flush the HTTP cache from the admin panel.
- **Plugin/CryptPad version drift**: the plugin has hard version pairing with the image - `OPENID_CLIENT_ERROR` on login usually means the pairing broke after an image bump.

## References

- [CryptPad Admin Guide](https://docs.cryptpad.org/en/admin_guide/)
- [Configuration Reference](https://docs.cryptpad.org/en/admin_guide/customization.html)
- [SSO Plugin](https://github.com/cryptpad/sso)
