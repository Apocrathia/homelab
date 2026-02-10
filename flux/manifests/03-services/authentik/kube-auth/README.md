# Kubernetes OIDC Authentication via Authentik

Enables OIDC-based authentication to the Kubernetes cluster using Authentik as the identity provider.

> **Navigation**: [← Back to Authentik README](../README.md)

## Components

| Resource                   | Purpose                                                   |
| -------------------------- | --------------------------------------------------------- |
| `authentik-blueprint.yaml` | Authentik OIDC provider, groups, and application          |
| `rbac.yaml`                | ClusterRoleBindings mapping Authentik groups to K8s roles |

## Authentik Groups

| Group                  | Kubernetes Role | Access Level                              |
| ---------------------- | --------------- | ----------------------------------------- |
| `kubernetes-admins`    | `cluster-admin` | Full cluster access                       |
| `kubernetes-operators` | `edit`          | Create/modify resources in all namespaces |
| `kubernetes-viewers`   | `view`          | Read-only access to all namespaces        |

## Setup

### 1. Apply Talos API Server Configuration

Add OIDC configuration to your Talos control plane patches:

```yaml
cluster:
  apiServer:
    extraArgs:
      oidc-issuer-url: "https://auth.gateway.services.apocrathia.com/application/o/kubernetes/"
      oidc-client-id: "kubernetes"
      oidc-username-claim: "email"
      oidc-username-prefix: "oidc:"
      oidc-groups-claim: "groups"
      oidc-groups-prefix: "oidc:"
```

Apply with `talosctl apply-config`.

### 2. Add Yourself to kubernetes-admins Group

In Authentik Admin UI:

1. Go to **Directory → Groups**
2. Find `kubernetes-admins`
3. Add your user to the group

### 3. Install kubelogin

```bash
# macOS
brew install int128/kubelogin/kubelogin

# Or via krew
kubectl krew install oidc-login
```

### 4. Configure kubeconfig

Add to `~/.kube/config`:

```yaml
users:
  - name: oidc-user
    user:
      exec:
        apiVersion: client.authentication.k8s.io/v1beta1
        command: kubectl
        args:
          - oidc-login
          - get-token
          - --oidc-issuer-url=https://auth.gateway.services.apocrathia.com/application/o/kubernetes/
          - --oidc-client-id=kubernetes
          - --oidc-extra-scope=groups
          - --oidc-extra-scope=email

contexts:
  - name: homelab-oidc
    context:
      cluster: home
      user: oidc-user
```

### 5. Test Authentication

```bash
kubectl config use-context homelab-oidc
kubectl get nodes
```

Browser will open for Authentik login. After authentication, kubectl commands work normally.

## Token Caching

kubelogin caches tokens in `~/.kube/cache/oidc-login/`. Tokens refresh automatically.

To force re-authentication:

```bash
rm -rf ~/.kube/cache/oidc-login/
```

## Troubleshooting

### "Unauthorized" errors

- Verify you're in the correct Authentik group
- Check API server logs: `talosctl logs -n <node> kube-apiserver`
- Verify OIDC issuer URL matches exactly

### Token issues

- Clear token cache and re-authenticate
- Check token contents: `kubectl oidc-login get-token --oidc-issuer-url=... | jq -R 'split(".") | .[1] | @base64d | fromjson'`

### Groups not appearing

- Verify `groups` scope is included in provider
- Check scope mapping expression in Authentik

## References

- **[Authentik Kubernetes Integration](https://docs.goauthentik.io/docs/providers/oauth2/)** - OIDC provider documentation
- **[kubelogin](https://github.com/int128/kubelogin)** - Kubernetes OIDC authentication plugin
