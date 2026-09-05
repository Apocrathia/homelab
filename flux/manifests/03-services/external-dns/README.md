# ExternalDNS - UniFi DNS Record Management

Automated DNS record management for the UniFi controller via ExternalDNS and a webhook provider.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

ExternalDNS watches Kubernetes HTTPRoutes and Services and keeps matching DNS
records in sync on the UniFi controller (UDM at `10.100.1.1`). DNS record
changes are applied through the
[external-dns-unifi-webhook](https://github.com/home-operations/external-dns-unifi-webhook)
sidecar, which speaks the ExternalDNS webhook protocol on one side and the
UniFi Network Integration API (DNS Policies) on the other.

- **Domain filter**: `apocrathia.com` (LAN DNS zone served by the UDM; CoreDNS
  forwards `apocrathia.com` to `10.100.1.1`)
- **Excluded**: `tailnet.apocrathia.com` — served by the Tailscale gateway and
  uses a wildcard hostname (`*.tailnet.apocrathia.com`), which UniFi dnsmasq
  cannot represent
- **Sources**: `gateway-httproute`, `service`
- **Policy**: `sync` (create and delete records), TXT registry with
  `txtOwnerId: main`

## Architecture

| Component  | Implementation                                               |
| ---------- | ------------------------------------------------------------ |
| Controller | `external-dns` chart `1.21.1` (kubernetes-sigs)              |
| Provider   | `ghcr.io/home-operations/external-dns-unifi-webhook:0.10.12` |
| Upstream   | UniFi Network Integration API at `https://10.100.1.1` (UDM)  |
| Secrets    | 1Password item `unifi-dns-secrets` via `OnePasswordItem`     |

Records point at the Gateway's status address (`10.100.1.99`), so every
HTTPRoute hostname on `main-gateway` resolves on the LAN automatically.

## Configuration

### UniFi API key bootstrap

The webhook authenticates with a UniFi API key (username/password is not
supported by the Integration API):

1. On the UDM: **Settings → Control Plane → Integrations → Create API Key**
   (requires Super Admin to create; the account can be downgraded to Site
   Admin afterwards for least privilege).
2. Create 1Password item `unifi-dns-secrets` in vault `Secrets` with a field
   labeled `UNIFI_API_KEY` containing the key.
3. The `OnePasswordItem` in `secret.yaml` syncs it to the `unifi-dns-secrets`
   Secret in the `external-dns` namespace.

### Key values

Set in `helmrelease.yaml`:

| Value            | Setting                    | Notes                                    |
| ---------------- | -------------------------- | ---------------------------------------- |
| `UNIFI_HOST`     | `https://10.100.1.1`       | UDM; webhook skips TLS verify by default |
| `domainFilters`  | `apocrathia.com`           | Only manage this zone                    |
| `excludeDomains` | `tailnet.apocrathia.com`   | Wildcard tailnet zone not supported      |
| `policy`         | `sync`                     | Full create/delete lifecycle             |
| `txtPrefix`      | `k8s.main.%{record_type}-` | Ownership registry in UniFi TXT records  |

## Limitations

Inherited from UniFi dnsmasq (see webhook README):

- **No wildcards** — `*.example.com` records fail; tailnet zone is excluded
  for this reason.
- **One CNAME per name** — additional targets are dropped with a warning.

## Troubleshooting

```bash
# Controller + webhook logs
kubectl -n external-dns logs deploy/external-dns -c external-dns
kubectl -n external-dns logs deploy/external-dns -c webhook

# Records external-dns wants to manage
kubectl -n external-dns logs deploy/external-dns -c external-dns | grep -i "desired"
```

- **Records not appearing**: check the webhook `/readyz` probe (it probes the
  UniFi API); a bad API key shows up there first.
- **Reconcile errors mentioning wildcards**: confirm `excludeDomains` still
  covers any wildcard hostnames added to Gateways.

## Related Documentation

- [Webhook provider](https://github.com/home-operations/external-dns-unifi-webhook)
- [ExternalDNS chart](https://github.com/kubernetes-sigs/external-dns/tree/master/charts/external-dns)
- [UniFi Network Integration API](https://developer.ui.com/network/)
