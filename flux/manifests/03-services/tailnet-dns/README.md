# Tailnet DNS - split-DNS resolver for friends

Tailnet-internal DNS for `gateway.services.apocrathia.com`, so invited friends
(and the operator's own tailnet devices) resolve the same hostnames the LAN
uses, pointed at `tailnet-gateway` instead of `main-gateway`. LAN-only zones
(`services.apocrathia.com`, `access.apocrathia.com`) are covered too — see
[How it works](#how-it-works).

> **Navigation**: [← Back to Services README](../README.md)

## Overview

Part of the [tailnet split DNS plan](../../../../docs/plans/tailnet-split-dns.md).
Friends are invited tailnet users, not device-shares, and Tailscale split DNS
(restricted nameserver for `services.apocrathia.com`) sends their
queries for the homelab zones here. App records point at `tailnet-gateway`'s
tailnet address (`100.120.155.113`); LAN-only names (e.g.
`storage.services.apocrathia.com`, `ians-gaming-pc.access.apocrathia.com`)
resolve to LAN IPs via the LAN DNS (10.100.1.1) — visible to friends but
unroutable for them (deny-by-default).

| Component     | Implementation                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resolver      | CoreDNS (plain manifests, `coredns.yaml`) serving the app zone from etcd; other `services.apocrathia.com` and `access.apocrathia.com` names forward to the LAN DNS (10.100.1.1) |
| Record store  | Single-member etcd (`etcd.yaml`), disposable emptyDir state                                                                                                                     |
| Record writer | ExternalDNS instance #2 (`external-dns-tailnet`, chart `1.21.1`, coredns provider)                                                                                              |
| Tailnet leg   | `tailnet-dns` Service exposed via `tailscale.com/expose` (operator L3, TCP+UDP 53)                                                                                              |

## How it works

1. ExternalDNS (`helmrelease.yaml`) watches `gateway-httproute` sources
   filtered to `tailnet-gateway` (`--gateway-name=tailnet-gateway`) and writes
   per-app A records (target = tailnet-gateway's status address) into etcd
   under `/skydns`. `txtOwnerId: tailnet` keeps its TXT registry separate from
   the UniFi instance.
2. CoreDNS serves `gateway.services.apocrathia.com` from that etcd. Names
   elsewhere under `services.apocrathia.com` or under the whole
   `access.apocrathia.com` zone (LAN-only, e.g.
   `storage.services.apocrathia.com`, `ians-gaming-pc.access.apocrathia.com`)
   forward to the LAN DNS (`10.100.1.1`) — the same answers LAN clients get.
   All other zones are refused; this is not a general resolver.
3. The `tailnet-dns` Service carries `tailscale.com/expose: "true"`, so the
   Tailscale operator runs a proxy device `tailnet-dns.taila8ef8c.ts.net`
   (tagged `tag:k8s`) that DNATs TCP and UDP 53 to the Service. Only
   Service-declared ports are reachable through the ClusterIP, so the proxy
   exposes DNS and nothing else.
4. The UniFi-backed ExternalDNS in [../external-dns](../external-dns/) keeps
   writing LAN records and is filtered to `main-gateway`. The two instances
   must stay gateway-filtered: dual-parentRef routes (e.g. Authentik) would
   otherwise write CGNAT addresses into the UDM and break LAN clients.

etcd state is deliberately disposable (emptyDir). If etcd restarts empty,
ExternalDNS rebuilds every record on its next sync; expect a sub-minute gap.

## Static zone: game.apocrathia.com

The Corefile also serves a static `hosts`-plugin zone for
`game.apocrathia.com` (the bare AMP game host). The record is static because
nothing in-cluster sources it; the address is the game host's tailnet IPv4,
read on the host with `tailscale ip -4` after it joins, and stable across
restarts. LAN clients keep using the UniFi-resolved LAN IP; tailnet clients
get the tailnet address from this zone.

## Split DNS configuration (post-deploy, operator step)

The tailnet must send `services.apocrathia.com`, `access.apocrathia.com`,
and `game.apocrathia.com` queries to the resolver device. The nameserver must be an IP, and the proxy device's tailnet
IP is only knowable after first deploy:

1. After Flux rolls out this stack, read the device IP:
   `kubectl -n tailnet-dns get svc tailnet-dns` (EXTERNAL-IP column, or the
   proxy device `tailnet-dns` in the Tailscale admin console).
2. Set the restricted nameserver via Terraform
   (`terraform/deployments/tailscale/tailnet/terragrunt.hcl`,
   `dns_split_dns` input - commented block there) or the admin console
   (DNS -> Add nameserver -> Custom -> one entry per zone +
   the device IP). Terraform is preferred; the tailnet policy and DNS are
   otherwise managed there.

The device IP is stable across pod restarts (the operator persists proxy
identity in its state Secret), so this is a one-time step.

## Troubleshooting

```bash
# Resolver pods and etcd health
kubectl -n tailnet-dns get pods
kubectl -n tailnet-dns logs deploy/coredns
kubectl -n tailnet-dns logs deploy/etcd

# Records external-dns wrote (skydns keys under /skydns)
kubectl -n tailnet-dns logs deploy/external-dns-tailnet

# Query the resolver from inside the cluster
kubectl -n tailnet-dns run -it --rm dig --image=busybox --restart=Never --   nslookup auth.gateway.services.apocrathia.com tailnet-dns.tailnet-dns.svc
```

- **Friends cannot resolve app names**: check the split-DNS nameserver matches
  the current device IP, and that the tailnet policy grants their group
  TCP/UDP 53 to `tag:k8s` (admins: grant already present; friends:
  `group:friends` + grant land with the first invite, slice 3).
- **`nslookup` fails for non-split zones**: intended. Only
  `services.apocrathia.com`, `access.apocrathia.com`, and
  `game.apocrathia.com` are served; everything else is REFUSED.
- **Records missing after etcd restart**: ExternalDNS rebuilds on its next
  sync (interval 1m / on event).

## References

- [Tailnet split DNS plan](../../../../docs/plans/tailnet-split-dns.md)
- [ExternalDNS CoreDNS + etcd tutorial](https://kubernetes-sigs.github.io/external-dns/latest/tutorials/coredns-etcd/)
- [CoreDNS etcd plugin](https://coredns.io/plugins/etcd/)
- [Tailscale operator L3 service exposure](https://tailscale.com/docs/kubernetes-operator/ingress)
