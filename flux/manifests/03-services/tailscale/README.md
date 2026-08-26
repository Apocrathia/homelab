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

## Service sharing with external users

Pattern for sharing homelab services with friends over Tailscale without any
public internet exposure. Follows the official
[BYO custom domain Gateway API solution](https://tailscale.com/docs/solutions/kubernetes-operator-byod-gateway-api),
adapted for this cluster's Cilium GatewayClass.

### Architecture

- `tailnet-gateway.yaml` defines `CiliumGatewayClassConfig tailscale-gateway-config`
  (the generated LoadBalancer Service gets `loadBalancerClass: tailscale`),
  `GatewayClass cilium-tailscale`, and `Gateway tailnet-gateway` with an HTTPS
  listener for `*.tailnet.apocrathia.com`.
- The operator turns the gateway's LoadBalancer Service into one tailnet
  device: `cilium-system-cilium-gateway-tailnet-gateway.taila8ef8c.ts.net`,
  IP `100.120.155.113`, tagged `tag:k8s`. **This device is the one shared
  with external users.** If the device is ever recreated, update the DNS
  record content (below).
- Per-app `HTTPRoute` resources bind `<app>.tailnet.apocrathia.com` to the
  gateway. Pilot: `04-apps/demo-app/tailnet-httproute.yaml` (direct to the
  app, no Authentik — friends must not land on the homelab IdP).
- TLS: wildcard cert `*.tailnet.apocrathia.com` from cert-manager DNS-01
  (`tailnet-gateway-cert.yaml`), terminated at the gateway.
- DNS: `*.tailnet.apocrathia.com` A record pointing at the device IP lives in
  `terraform/deployments/cloudflare/dns` (gray cloud — the CGNAT target is
  only reachable through Tailscale, so the name is public but the service is
  not).
- Policy: the tailnet policy file is externally managed via
  `terraform/deployments/tailscale/tailnet` (the console policy editor is
  locked) and is deny-by-default. The friend-facing grant is
  `autogroup:shared` -> `tag:k8s` port 443: whatever shared users may reach,
  and nothing else.

### Sharing a service with a friend

1. Give the service an `HTTPRoute` on `tailnet-gateway` (copy the demo-app
   route, change hostname and backend).
2. In the Tailscale admin console, open the gateway device and select
   **Share**: invite by email or copy an invite link. Recipients need their
   own Tailscale account and must be admin of their own tailnet (free plan
   works).
3. The recipient accepts and reaches `https://<app>.tailnet.apocrathia.com`.
   Shared devices are quarantined by default (receive-only) and visible only
   to that one user.
4. Revoke any time from the same Share dialog. Revoking cuts the user off;
   the route and DNS record stay.

Tagged devices can be shared — the old assumption that they cannot came from
[tailscale/tailscale#10633](https://github.com/tailscale/tailscale/issues/10633),
which was a Tailnet Lock issue; Tailnet Lock is not enabled here.

### Troubleshooting

- **Invited friend cannot reach the service**: grants from `autogroup:shared`
  to a tag destination may not be honored for shared tagged devices
  ([tailscale/tailscale#14445](https://github.com/tailscale/tailscale/issues/14445)).
  Workaround: in the policy, switch the `autogroup:shared` grant destination
  from `tag:k8s` to the gateway device's IP or name, then re-apply.
- **Name resolves but nothing loads**: the wildcard DNS record points at the
  gateway device's CGNAT address, which is only reachable through Tailscale.
  Confirm the client device is connected to Tailscale before debugging the
  cluster.

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
