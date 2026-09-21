# WAN DNS - per-ISP public records for the dual-WAN gateway

ExternalDNS instance #3, scoped to exactly two hostnames in the public
Cloudflare zone `apocrathia.com`: `conexon.apocrathia.com` (WAN1 / ISP
"Conexon") and `stratusiq.apocrathia.com` (WAN2 / ISP "StratusIQ"). The IPs
come from the UniFi API - the [`unifi-wan-ip-sync`](../../04-apps/management/scripts/unifi/wan-ip-sync/README.md)
CronJob reads the UXG-PRO gateway's WAN addresses and patches them into a
`DNSEndpoint` CR; this instance turns that CR into Cloudflare A records.

> **Navigation**: [← Back to Services README](../README.md)

## Why (and why UniFi DDNS alone was not enough)

The UXG-PRO keeps its own Cloudflare DDNS entries (Settings -> Internet ->
WAN), and those **stay enabled** as a gateway-side fallback. But UniFi DDNS
only upserts: it never deletes. After a controller migration it minted a
duplicate record for one ISP and left a dead stale record behind, and
UptimeRobot kept hitting the dead one - a false "ISP down". ExternalDNS with
`policy: sync` is the fix: ownership is tracked with TXT registry labels
(`k8s.wan.A-...`), and any stray record at an owned name is pruned within one
sync, so the false-positive tug self-resolves.

## Architecture

| Component  | Implementation                                                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controller | `external-dns` chart `1.22.0` (kubernetes-sigs), instance `external-dns-wan`                                                                                            |
| Provider   | Cloudflare (public zone `apocrathia.com`), token via 1Password item `cloudflare-api-token`                                                                              |
| Source     | `crd` - the `DNSEndpoint` CR `wan-ips` in `unifi-scripts`, patched every 5 minutes by [unifi-wan-ip-sync](../../04-apps/management/scripts/unifi/wan-ip-sync/README.md) |
| Registry   | TXT ownership labels, `txtOwnerId: wan`, prefix `k8s.wan.%{record_type}-`                                                                                               |

Scope is deliberately tiny and disjoint from the other two instances:

- [../external-dns](../external-dns/README.md) - UniFi webhook provider, LAN
  records from `main-gateway` routes/services (UniFi local DNS).
- [../tailnet-dns](../tailnet-dns/README.md) - CoreDNS/etcd provider, tailnet
  app zone from `tailnet-gateway` routes.
- This instance - Cloudflare provider, `crd` source only, A records at the two
  WAN hostnames. No `gateway-httproute`/`service` sources, so it cannot see
  any of the names the other instances own.

Records are public-internet facing (the WAN addresses are routable from
anywhere anyway); the CF records are public-zone only.

## The DNSEndpoint CR is runtime state, not git state

The `wan-ips` DNSEndpoint CR in `unifi-scripts` is **not** in this repo. The
helper CronJob creates and owns it at runtime - generated state, same as the
UniFi firewall-group content the sibling job manages out-of-git. Nothing here
should be patched by hand; the next run would overwrite it.

Pre-existing cluster dependency: the `dnsendpoints.externaldns.k8s.io` CRD
(v1alpha1) is installed in-cluster and is **not** tracked in this repo. Chart
`1.22.0`'s ClusterRole already grants `dnsendpoints` get/watch/list + status
update when `crd` is in sources, so no extra RBAC ships with this instance.

## Deployed objects

| Object                                          | Purpose                          |
| ----------------------------------------------- | -------------------------------- |
| `Namespace` `wan-dns`                           | Restricted pod-security labels   |
| `OnePasswordItem` `cloudflare-api-token-secret` | Syncs the CF token Secret        |
| `HelmRelease` `external-dns-wan`                | ExternalDNS, Cloudflare provider |

## 1Password item `cloudflare-api-token`

The **same item cert-manager uses** (`vaults/Secrets/items/cloudflare-api-token`),
referenced by a second `OnePasswordItem` in this namespace. The synced Secret
key `api-token` feeds `CF_API_TOKEN`. The token needs Zone:Edit on
`apocrathia.com` - the cert-manager token already has this.

## Tunables (manifests only)

Chart version, provider env, `domainFilters`, `txtOwnerId`, `managed-record-types`,
and the hostnames themselves (in the CronJob env) live in `helmrelease.yaml`
and the helper's `cronjob.yaml`.

## Runbook

### One-time adoption

ExternalDNS will not adopt records it did not create (no TXT ownership label
at the name). Delete the two A records (`conexon`, `stratusiq`) in the
Cloudflare dashboard **once**, after the stack is live:

1. Deploy, wait for `external-dns-wan` to be ready.
2. Delete the `conexon` A record in CF. Within one sync (interval 5m /
   `triggerLoopOnEvent`) external-dns recreates it from the `wan-ips` CR with
   a `k8s.wan.A-...` TXT ownership label. Each deletion is a ~30s blip on
   that name.
3. Repeat for `stratusiq`.
4. Keep the UniFi DDNS entries enabled (see below) - they act as fallback and
   their records get re-owned on their next tug anyway.

### Acceptance test

Prove `policy: sync` pruning works: add a bogus A record at
`conexon.apocrathia.com` in the CF dashboard (e.g. `192.0.2.1`). Within one
sync the `external-dns-wan` logs should show it pruned - `policy: sync`
deletes any record at an owned name that is not in the desired state:

```bash
kubectl -n wan-dns logs deploy/external-dns-wan | grep -i "delete\|prune"
```

Clean up: none needed - the bogus record is the thing external-dns deletes.

### UniFi DDNS entries stay enabled

The gateway's own Cloudflare DDNS entries are the fallback if the cluster is
down. Expected tug-of-war behavior when both sides are healthy:

- UniFi upserts the same current IP -> external-dns adopts and labels it, no
  churn. UniFi upserts a stale IP -> external-dns prunes the stray and
  recreates the record from the CR within one sync. Either way the name
  always resolves to the current IP.
- WAN IP changes -> the helper notices within its 5-minute cadence -> the CR
  is patched -> `triggerLoopOnEvent` fires external-dns immediately. A stale
  value lives for at most ~5 minutes, and the false "ISP down" tug
  self-resolves instead of persisting.

## Troubleshooting

```bash
# Controller logs
kubectl -n wan-dns logs deploy/external-dns-wan

# The source CR (owned by the helper, runtime state)
kubectl -n unifi-scripts get dnsendpoints wan-ips -o yaml

# Helper job logs (job pods in unifi-scripts, lines prefixed with pod name)
kubectl -n unifi-scripts logs -l job-name --prefix --tail=50
```

- **Records not updating**: check the `wan-ips` CR has fresh IPs (helper
  logs first), then external-dns logs for CF API errors.
- **`Forbidden` on `dnsendpoints`**: the CRD must exist first - see
  [The DNSEndpoint CR is runtime state](#the-dnsendpoint-cr-is-runtime-state-not-git-state).

## References

- [ExternalDNS CRD source](https://kubernetes-sigs.github.io/external-dns/latest/sources/crd/)
- [ExternalDNS Cloudflare provider](https://kubernetes-sigs.github.io/external-dns/latest/tutorials/cloudflare/)
- [Helper: unifi-wan-ip-sync](../../04-apps/management/scripts/unifi/wan-ip-sync/README.md)
