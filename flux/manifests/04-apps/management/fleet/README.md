# Fleet

Open-source device management platform built on osquery. Inventory, queries, and vulnerability visibility for macOS, Windows, Linux, and more.

> **Navigation**: [← Back to Management README](../README.md)

## Overview

- Fleet server via the official Helm chart
- MySQL and Valkey from the chart's bundled subcharts (dev/test posture)
- Gateway API access; TLS terminated at the gateway
- Authentik SAML for user SSO; SCIM backchannel for IdP vitals on hosts (no proxy — agents need open API paths)
- Org settings managed as GitOps under `config/` (`fleetctl gitops`)

## Access

- **URL**: `https://fleet.gateway.services.apocrathia.com`

## Configuration

See `helmrelease.yaml` for deployment values. Fleet org settings, policies, and team YAML live under `config/` and are applied by the `fleet-gitops` CI job (`config/.gitlab-ci.yml`).

Layout and upstream pattern: [`config/README.md`](./config/README.md).

### CI apply

| Trigger                                           | Behavior |
| ------------------------------------------------- | -------- |
| MR changing `config/**`                           | Dry-run  |
| Push to default branch changing `config/**`       | Apply    |
| Hourly schedule with `FLEET_GITOPS_SCHEDULE=true` | Apply    |

Required CI/CD variables (masked):

| Variable                     | Purpose                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| `FLEET_URL`                  | `https://fleet.gateway.services.apocrathia.com`               |
| `FLEET_API_TOKEN`            | API-only user token (GitOps role; admin on Fleet Free)        |
| `FLEET_GLOBAL_ENROLL_SECRET` | Global enroll secret (`default.yml` → `org_settings.secrets`) |

Create an [API-only user](https://fleetdm.com/docs/using-fleet/fleetctl-cli#create-api-only-user), then add a pipeline schedule:

- **Build → Pipeline schedules**
- Cron: `0 * * * *` (hourly)
- Target branch: default
- Variable: `FLEET_GITOPS_SCHEDULE` = `true` (keeps other schedules from running this job)

Local dry-run:

```bash
export FLEET_URL=https://fleet.gateway.services.apocrathia.com
export FLEET_API_TOKEN=...
export FLEET_GLOBAL_ENROLL_SECRET=...
fleetctl config set --address "$FLEET_URL" --token "$FLEET_API_TOKEN"
FLEET_DRY_RUN_ONLY=true ./flux/manifests/04-apps/management/fleet/config/gitops.sh
```

### Secrets

Create a 1Password item at `vaults/Secrets/items/fleetdm-secrets` with:

| Field                 | Description                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| `mysql-root-password` | MySQL root password                                                          |
| `mysql-password`      | MySQL `fleet` user password                                                  |
| `license-key`         | Fleet Premium license key                                                    |
| `private-key`         | Fleet server private key (`openssl rand -base64 32`; required for MDM)       |
| `enroll-secret`       | Global osquery enroll secret (same value as CI `FLEET_GLOBAL_ENROLL_SECRET`) |

The OnePasswordItem creates Secret `fleetdm-secrets`. MySQL, license, and
`FLEET_SERVER_PRIVATE_KEY` / `FLEET_PACKAGING_GLOBAL_ENROLL_SECRET` all read from it.

`enroll-secret` must match the GitOps enroll secret: Helm seeds it on pod start;
`config/default.yml` applies it via `$FLEET_GLOBAL_ENROLL_SECRET` in CI.

## Authentication

Users authenticate with Authentik via SAML (`authentik-blueprint.yaml`). Do not put Authentik proxy in front of Fleet — osquery/MDM agents must reach the API without an outpost.

SSO settings live in `config/default.yml` under `org_settings.sso_settings` (applied by GitOps). IdP icon: `config/lib/all/icons/authentik.svg`.

With Premium, JIT user provisioning creates accounts on first SSO login (`enable_jit_provisioning: true`).

Fleet blocks outbound fetches to private IPs by default (SSRF). This cluster’s
gateway hostnames resolve to RFC1918, so the HelmRelease sets
`FLEET_SERVER_ALLOW_PRIVATE_NETWORK_INTEGRATIONS=true`.
`FLEET_SERVER_PRIVATE_KEY` comes from `fleetdm-secrets` via a Helm
`postRenderers` kustomize patch (the chart’s empty default cannot be nulled
through Flux inline values).

After the first successful GitOps apply: edit your user → Authentication → Single sign-on, then test SSO before disabling password auth.

Optional: enable UI GitOps mode under **Settings → Integrations → Change management** so the UI cannot drift settings that GitOps owns.

### SCIM (IdP vitals on hosts)

Premium feature. Authentik pushes users/groups to Fleet over SCIM so hosts can show IdP full name, groups, and department ([Fleet guide](https://fleetdm.com/guides/foreign-vitals-map-idp-users-to-hosts#other-idps)). This is separate from SAML SSO — keep both.

The blueprint creates `fleetdm-scim-provider` as a **backchannel** on the Fleet DM application, plus a trimmed user property mapping (Fleet's SCIM schema rejects Authentik's default extra attributes). Token is **not** in the blueprint.

1. In Fleet, create an [API-only user](https://fleetdm.com/docs/using-fleet/fleetctl-cli#create-api-only-user) with **Maintainer** (access to `/scim/*`). Copy its API token.
2. In Authentik: **Applications → Providers → fleetdm-scim-provider → Edit**. Paste the token into **Token**, save.
3. Trigger a sync (provider page → sync) or wait for Authentik's hourly sync. Confirm under Fleet **Settings → Integrations → Identity provider (IdP)**.
4. Hosts get IdP vitals when an end user authenticates during MDM enrollment (or when you set IdP username on the host). `userName` is the user's email to match SAML NameID.

Authentik workers must reach `https://fleet.gateway.services.apocrathia.com` (in-cluster egress to the gateway VIP).

## Logs

Osquery status and result logs go to Fleet container stdout (`statusPlugin` /
`resultPlugin: stdout`), which Alloy scrapes into Loki.

```logql
{namespace="fleet",container="fleet"}
```

Server process logs use the same stream. Audit/activity history lives in the
Fleet UI / API (not a separate Loki stream unless you enable Fleet's audit log
plugin).

Grafana dashboard: `GrafanaDashboard/fleet-dm` (Security folder), defined
under `grafana/` (`dashboard.json` → ConfigMap `fleet-dm-dashboard`).

HTTP panels filter with `|= "component=http "` (trailing space). Alloy already
sets stream label `component=alloy`, so `| logfmt | component="http"` never
matches — Loki renames the line field to `component_extracted`.

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
- [Fleet GitOps](https://fleetdm.com/docs/using-fleet/gitops)
- [Fleet SSO (Authentik)](https://fleetdm.com/docs/deploy/single-sign-on-sso#authentik)
- [Foreign vitals / SCIM](https://fleetdm.com/guides/foreign-vitals-map-idp-users-to-hosts)
- [Authentik SCIM provider](https://docs.goauthentik.io/add-secure-apps/providers/scim/)
- [Log destinations](https://fleetdm.com/guides/log-destinations)
- [fleetdm/fleet-gitops](https://github.com/fleetdm/fleet-gitops)
- [fleetdm/fleet](https://github.com/fleetdm/fleet)
