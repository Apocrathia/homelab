# Fleet

Open-source device management platform built on osquery. Inventory, queries, and vulnerability visibility for macOS, Windows, Linux, and more.

> **Navigation**: [← Back to Management README](../README.md)

## Overview

- Fleet server via the official Helm chart
- MySQL and Valkey from the chart's bundled subcharts (dev/test posture)
- Gateway API access; TLS terminated at the gateway
- Authentik SAML for user SSO (no proxy — agents need open API paths)

## Access

- **URL**: `https://fleet.gateway.services.apocrathia.com`

## Configuration

See `helmrelease.yaml` for deployment values. Fleet org settings live under `config/` and are applied with `fleetctl apply`.

### Secrets

Create a 1Password item at `vaults/Secrets/items/fleetdm-secrets` with:

| Field                 | Description                                            |
| --------------------- | ------------------------------------------------------ |
| `mysql-root-password` | MySQL root password                                    |
| `mysql-password`      | MySQL `fleet` user password                            |
| `license-key`         | Fleet Premium license key                              |
| `private-key`         | `FLEET_SERVER_PRIVATE_KEY` (`openssl rand -base64 32`) |

The OnePasswordItem creates Secret `fleetdm-secrets`, consumed by MySQL, Fleet, and the Premium license. `private-key` is required before Apple MDM / `fleetctl generate mdm-apple`.

## Authentication

Users authenticate with Authentik via SAML (`authentik-blueprint.yaml`). Do not put Authentik proxy in front of Fleet — osquery/MDM agents must reach the API without an outpost.

SSO uses Authentik SAML (`authentik-blueprint.yaml`). Do not put Authentik proxy in front of Fleet — osquery/MDM agents must reach the API without an outpost.

With Premium, JIT user provisioning creates accounts on first SSO login (`enable_jit_provisioning: true` in `config/sso.yaml`).

### Apply SSO settings

```bash
fleetctl config set --address https://fleet.gateway.services.apocrathia.com
fleetctl login
fleetctl apply -f flux/manifests/04-apps/management/fleet/config/sso.yaml
```

Values in `config/sso.yaml`:

- Entity ID: `https://fleet.gateway.services.apocrathia.com` (matches Authentik audience)
- Metadata URL: `https://auth.gateway.services.apocrathia.com/application/saml/fleetdm/metadata/`
- Issuer URI: `authentik` (matches Authentik EntityID/Issuer override)
- IdP image: `config/authentik.svg` (GitLab raw URL on the login button)
- IdP-initiated login: enabled (Authentik dashboard tile under Home)

Fleet blocks outbound fetches to private IPs by default (SSRF). This cluster’s
gateway hostnames resolve to RFC1918, so the HelmRelease sets
`FLEET_SERVER_ALLOW_PRIVATE_NETWORK_INTEGRATIONS=true`.

After apply: edit your user → Authentication → Single sign-on, then test SSO before disabling password auth.

## Troubleshooting

```bash
kubectl get pods -n fleet
kubectl logs -n fleet deploy/fleet -f
kubectl get secret -n fleet fleetdm-secrets
kubectl get configmap -n authentik -l authentik_blueprint=true | grep fleetdm
kubectl logs -n authentik deploy/authentik-server -c sidecar-blueprints --tail=50
```

Health check path: `/healthz` (also used by the chart probes).

## References

- [Deploy Fleet on Kubernetes](https://fleetdm.com/guides/deploy-fleet-on-kubernetes)
- [Fleet SSO (Authentik)](https://fleetdm.com/docs/deploy/single-sign-on-sso#authentik)
- [fleetdm/fleet](https://github.com/fleetdm/fleet)
