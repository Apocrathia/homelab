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

## Exit node

`config/exit-node.yaml` runs a `Connector` (`exitNode: true`, 2 replicas) whose pods advertise as tailnet exit nodes: `exit-node-0` and `exit-node-1`, tagged `tag:k8s`. Clients select one with `tailscale set --exit-node=exit-node-0` or the OS app.

Do not use a `ProxyGroup` (`type: egress`) for this — egress ProxyGroups are HA L3 egress _to_ tailnet targets via `ExternalName` Services; the operator never configures their pods to advertise as exit nodes. Exit nodes (and subnet routers and app connectors) are the `Connector` CRD's job; `replicas` + `hostnamePrefix` give the HA story.

The Connector lives under `config/` in its own Flux Kustomization (`services-tailscale-config`, `dependsOn: services-tailscale`) because the operator Helm chart installs the CRD — a CR in the same Kustomization as its CRD-installing HelmRelease deadlocks server-side dry-run on a fresh cluster.

Exit-node routes need approval per device, and the Connector recreates pods on reschedule — so the tailnet policy auto-approves `tag:k8s` as exit nodes (`autoApprovers.exitNode` in `terraform/deployments/tailscale/tailnet/policy.hujson`). That policy is applied by Terraform, not Flux: apply it before or alongside the first rollout of this Connector, or the devices sit in the admin console awaiting approval.

## Service sharing with external users

Friends reach homelab apps over Tailscale as invited tailnet users - not
device-shares, and with no public DNS. They use the same
`gateway.services.apocrathia.com` hostnames the LAN uses, resolve them via
tailnet split DNS, and authenticate through Authentik like every LAN user.
Plan and slice status: [tailnet split DNS](../../../../docs/plans/tailnet-split-dns.md).

### Architecture

- `tailnet-gateway.yaml` defines `CiliumGatewayClassConfig tailscale-gateway-config`
  (the generated LoadBalancer Service gets `loadBalancerClass: tailscale`),
  `GatewayClass cilium-tailscale`, and `Gateway tailnet-gateway` with one HTTPS
  listener, `https-gateway-services`, serving
  `*.gateway.services.apocrathia.com` with the main-gateway's wildcard
  certificate (admitted by the existing `cert-manager-secrets`
  ReferenceGrant in `03-services/gateway/`).
- The operator turns the gateway's LoadBalancer Service into one tailnet
  device: `tailnet-gateway.taila8ef8c.ts.net`, tagged `tag:k8s`. The device
  hostname is pinned by the Gateway's `spec.infrastructure.annotations`
  (`tailscale.com/hostname`, propagated to the generated Service by Cilium);
  without it the operator falls back to `<namespace>-<service-name>`.
- Tailnet split DNS resolves `gateway.services.apocrathia.com` for tailnet
  clients to this gateway instead of `main-gateway`; the resolver stack lives
  in [Tailnet DNS](../tailnet-dns/README.md).
- Policy: the tailnet policy file is externally managed via
  `terraform/deployments/tailscale/tailnet` (the console policy editor is
  locked) and is deny-by-default. Admins reach `tag:k8s` over HTTPS (443)
  and DNS (tcp/udp 53, the split-DNS resolver). Friend emails never live
  in git; the friends grant (slice 3) uses an email-free src such as
  `autogroup:member` — on this invite-only tailnet every member other
  than the owner is a friend. Friends then get the same 443+53 access
  and nothing else - no exit-node, no internet.

### Friend-facing routes

Every route a friend can reach MUST go through the `tailnet-gateway`
(`https-gateway-services` listener, same hostname as LAN) with Authentik
SSO enforced somewhere in the path. Two sanctioned shapes, by app mode:

- **Outpost (proxy-mode apps)**: backendRef is the app's Authentik outpost
  Service (e.g. `ak-outpost-demo-app-outpost:9000`). Pilot:
  `04-apps/demo-app/tailnet-httproute.yaml` (interim two-route shape:
  the outpost-generated LAN route plus this app-side tailnet route; the
  chart learns to dual-parent the outpost route in slice 5).
- **Direct (OIDC-mode apps)**: backendRef is the app's own Service and the
  app enforces Authentik OIDC itself, with redirect URIs already minted on
  the same hostname (e.g. jellyfin's `/sso/OID/...`). Pilot: jellyfin —
  the chart-rendered route plus a postRenderers parentRef in its
  `helmrelease.yaml` (same-httproute shape, no extra files).

Direct backends with no Authentik auth in the path are forbidden - friends
hit the same SSO, redirect URIs, and app permissions as on the LAN. The
Authentik HTTPRoute in `03-services/authentik/httproute.yaml` dual-parents
the IdP's own hostname on `main-gateway` so OIDC flows complete.

Each app ships its own cross-namespace `ReferenceGrant` (in the authentik
namespace, `from` the app's namespace) in the same file as its shared route -
see the grant in the pilot file. The authentik manifests stay app-agnostic;
do not add app namespaces to any grant there.

Friends are invited as tailnet users; the friends grant in the tailnet
policy uses an email-free src (no friends list in git). Until it lands
(slice 3), nothing friend-facing is reachable (deny-by-default).

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
