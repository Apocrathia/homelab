# Tailscale Kubernetes operator

Manages Tailscale resources in the cluster: ingress/egress proxies, subnet routers, exit nodes, and API server access.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

This deployment installs the [Tailscale Kubernetes operator](https://tailscale.com/kb/1236/kubernetes-operator) via Helm. The operator talks to the Tailscale control plane and reconciles CRDs such as `Connector`, `ProxyClass`, and `ProxyGroup`.

Proxy pods created by the operator run `tailscaled` in privileged mode by default (NET_ADMIN/TUN). The `tailscale-system` namespace uses the `privileged` Pod Security standard so those proxies can start.

## Prerequisites

Before Flux reconciles this path:

1. In the [Tailscale admin console](https://login.tailscale.com/admin/settings/oauth), create an OAuth client with scopes to manage devices and tags.
2. Make the OAuth client owner of ACL tags `tag:k8s-operator` and `tag:k8s` (see [operator setup](https://tailscale.com/kb/1236/kubernetes-operator#setting-up-the-kubernetes-operator)).
3. Create a 1Password item at `vaults/Secrets/items/tailscale-secrets` with fields:
   - `oauth-client-id` — OAuth client ID
   - `oauth-client-secret` — OAuth client secret

The `OnePasswordItem` `tailscale-secrets` syncs those fields into a Kubernetes Secret of the same name. The chart maps them to `client_id` and `client_secret` at `/oauth` via `oauthSecretVolume`.

## Configuration

Operator and proxy defaults live in `helmrelease.yaml`. Workloads use Tailscale CRDs after the operator is running; nothing in this directory exposes a web UI.

### Optional features

- **API server proxy**: set `apiServerProxyConfig.mode` to `"true"` or `"noauth"` in `helmrelease.yaml`, or deploy a `ProxyGroup` of type `kube-apiserver`.
- **Custom proxy behavior**: create `ProxyClass` resources ([docs](https://tailscale.com/kb/1445/kubernetes-operator-customization)).

## Authentication

Not applicable. The operator authenticates to Tailscale with OAuth credentials from 1Password, not Authentik.

## Troubleshooting

```bash
kubectl get pods -n tailscale-system
kubectl logs -n tailscale-system deployment/operator -f
kubectl get connectors,proxyclasses,proxygroups -A
kubectl explain connector
```

If the operator pod crashes on startup, check that `tailscale-secrets` exists and contains `oauth-client-id` and `oauth-client-secret`:

```bash
kubectl get onepassworditem -n tailscale-system tailscale-secrets
kubectl get secret -n tailscale-system tailscale-secrets
```

### NextDNS blocks the control plane

If logs show `dial tcp 0.0.0.0:443: connect: connection refused` when calling `controlplane.tailscale.com`, DNS is returning a sinkhole address instead of Tailscale IPs. Privacy blocklists in NextDNS often block `controlplane.tailscale.com` and `api.tailscale.com`.

Allow those hostnames in the NextDNS allowlist, then flush stale answers:

```bash
dig +short controlplane.tailscale.com @45.90.28.214   # should be 192.200.0.x, not 0.0.0.0
kubectl rollout restart deployment/coredns -n kube-system
kubectl delete pod -n tailscale-system -l app=operator
```

Cluster pods use CoreDNS, which may cache the old `0.0.0.0` response until the deployment restarts or the cache TTL expires.

## References

- **[Kubernetes operator](https://tailscale.com/kb/1236/kubernetes-operator)** — setup and CRD overview
- **[Helm chart](https://github.com/tailscale/tailscale/tree/main/cmd/k8s-operator/deploy/chart)** — values and templates
- **[GitHub repository](https://github.com/tailscale/tailscale)** — source and issues
