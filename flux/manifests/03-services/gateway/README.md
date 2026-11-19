# Gateway

The cluster's edge: the `main-gateway` Gateway API listener plus the Cilium
LB IPAM/L2 plumbing that gives it a stable LAN address. The Envoy Gateway
controller serving the `envoy` GatewayClass is installed separately in
[`../envoy/`](../envoy/); this directory holds the gateway itself and its
policies.

> **Navigation**: [← Back to Services README](../README.md)

## Objects

| File                        | What it is                                                                                                                                                                                                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway.yaml`              | `Gateway/main-gateway` (ns `envoy-system`): HTTPS 443 with the wildcard cert, HTTP 80, a `matrix.apocrathia.com` listener, and TAK TCP/HTTPS listeners; plus `CiliumLoadBalancerIPPool` + `CiliumL2AnnouncementPolicy` pinning the LB IP, the cert-manager `ReferenceGrant`, and the 80→443 redirect `HTTPRoute` |
| `envoyproxy.yaml`           | `EnvoyProxy/gateway-proxy-config`: one proxy DaemonSet per node; LoadBalancer service with `Cluster` externalTrafficPolicy and Cilium hybrid LB mode on the pinned IP                                                                                                                                            |
| `backendtrafficpolicy.yaml` | `BackendTrafficPolicy` raising the request timeout on `main-gateway` + `tailnet-gateway` (slow LLM completions 504 under Envoy's default)                                                                                                                                                                        |
| `envoyextensionpolicy.yaml` | Coraza WAF (OWASP CRS, `DetectionOnly`; log, don't block) on `main-gateway`                                                                                                                                                                                                                                      |
| `gateway-cert.yaml`         | cert-manager wildcard `Certificate` for `*.gateway.services.apocrathia.com` (`letsencrypt-prod`)                                                                                                                                                                                                                 |

## Topology

- The Envoy Gateway controller (`../envoy/`) owns GatewayClass `envoy`; its
  GatewayClass-level parameters come from `envoyproxy.yaml` here
- Cilium LB IPAM assigns the gateway service its address from
  `gateway-pool` and the L2 policy announces it on `eth0`; both select the
  service by the `io.cilium.gateway/owning-gateway: main-gateway` label
- The wildcard certificate lives in `cert-manager` and is admitted to
  `envoy-system` Gateways through the ReferenceGrant; `matrix.apocrathia.com`
  carries its own cert admitted by a ReferenceGrant in the matrix app's
  directory

Apps attach with `HTTPRoute`s parented on `main-gateway` (or on
`tailnet-gateway`, see `../tailscale/`, for tailnet-only exposure).

## Troubleshooting

```bash
kubectl get gateway -n envoy-system
kubectl get httproute -A
kubectl get envoyproxy -n envoy-system
```

## References

- **[Gateway API](https://gateway-api.sigs.k8s.io/)** - API documentation
- **[Envoy Gateway](https://gateway.envoyproxy.io/)** - Controller documentation
