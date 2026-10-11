# OpenTAXII

TAXII server for the homelab threat-intel exchange - serves both TAXII 1.x and TAXII 2.1, giving MISP and OpenCTI feeders a place to push and pull STIX content.

> **Navigation**: [← Back to Security README](../README.md)

## Overview

This deployment includes:

- OpenTAXII served by gunicorn on port 9000, internal ClusterIP only
- PostgreSQL via CloudNativePG (both persistence and auth tables - no SQLite, no `/data` volume)
- TAXII 1.x services and one collection preloaded from a `data-configuration.yml` ConfigMap on every boot
- TAXII 2.1 enabled by default (api roots/collections created via CLI, see below)

## Image and TAXII support matrix

The upstream image ships both TAXII implementations in every recent tag; what differs is whether TAXII 2.1 is switched on by default:

| Tag                     | TAXII 1.0/1.1 | TAXII 2.1      | Notes                                                                                                |
| ----------------------- | ------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `0.9.3` (stable, 2022)  | on            | off by default | gunicorn 20.0.4 (CVE-2024-1135), Python 3.9 EOL; needs a full `opentaxii.yml` override to enable 2.1 |
| `0.10.0b1` (beta, 2026) | on            | on by default  | gunicorn 22.0.0, Python 3.10; current upstream line                                                  |

Deployed tag: `0.10.0b1`. The beta label is the tradeoff; it buys TAXII 2.1 out of the box (0.9.3 requires hand-maintaining the entire config to get it), current gunicorn, and the fixes queued for 0.10.0. If it misbehaves, dropping to `0.9.3` means losing default TAXII 2.1.

OpenCTI's TAXII2 connector only speaks TAXII 2.0/2.1, and modern MISP-to-OpenCTI exchange is STIX 2.x - so TAXII 2.1 is the one that matters for the integration path.

## Access

No external route. TAXII clients speak basic auth or bearer tokens; an Authentik proxy would break them. In-cluster only:

```text
http://opentaxii.opentaxii.svc.cluster.local:9000
```

| Endpoint              | Purpose                             |
| --------------------- | ----------------------------------- |
| `/taxii2/`            | TAXII 2.1 discovery (anonymous)     |
| `/services/discovery` | TAXII 1.x discovery (anonymous)     |
| `/management/health`  | Liveness/readiness probe target     |
| `/management/auth`    | POST username/password -> JWT token |

## Configuration

The image entrypoint generates `/tmp/opentaxii.yml` from `DATABASE_*` and `AUTH_DATABASE_*` env vars and points both TAXII servers at CNPG (`opentaxii-postgres-rw.opentaxii.svc.cluster.local`). TAXII 1.x services/collections come from the `opentaxii-data-configuration` ConfigMap (`config/data-configuration.yml`), synced by `opentaxii-sync-data` on every boot.

Any `OPENTAXII_*` env var overrides config keys (`__` separates nesting). See `helmrelease.yaml` for the full set.

### Secrets

1Password item `vaults/Secrets/items/opentaxii-secrets` provides:

- `username`, `password` - CNPG bootstrap and app database login
- `auth-secret` - JWT signing secret for `/management/auth` (the entrypoint default is a known string)

## Authentication

Zero accounts at boot. TAXII 1.x services run with `authentication_required: no`, which grants anonymous full access - fine while the service is reachable only inside the cluster. TAXII 2.1 collections follow their api-root public flag.

When a feeder needs real auth, create accounts out-of-band:

```bash
kubectl exec -n opentaxii deploy/opentaxii -- \
  opentaxii-create-account --username <user> --password <pw>
```

Then flip `authentication_required: yes` on the affected services in `config/data-configuration.yml`.

## TAXII 2.1 bootstrap

TAXII 2.1 api roots and collections are not part of `data-configuration.yml`; create them via CLI once, then point feeders at `/taxii2/<api-root-id>/`:

```bash
kubectl exec -n opentaxii deploy/opentaxii -- \
  opentaxii-add-api-root --title Default --description "Default api root" --default --public
kubectl exec -n opentaxii deploy/opentaxii -- \
  opentaxii-add-collection --rootid <api-root-id> --title "stix-feed" --public
```

## Troubleshooting

```bash
# Pod status
kubectl get pods -n opentaxii

# Application logs
kubectl logs -n opentaxii deploy/opentaxii -f

# Health check
kubectl run -it --rm curl --image=curlimages/curl -n opentaxii -- \
  curl -s http://opentaxii.opentaxii.svc.cluster.local:9000/management/health

# TAXII 2.1 discovery
kubectl run -it --rm curl --image=curlimages/curl -n opentaxii -- \
  curl -s http://opentaxii.opentaxii.svc.cluster.local:9000/taxii2/
```

The entrypoint prints `cp: cannot create regular file '/opentaxii.yml'` on every boot - expected under non-root; the working config is `/tmp/opentaxii.yml` via `OPENTAXII_CONFIG`.

## References

- [OpenTAXII GitHub repository](https://github.com/EclecticIQ/OpenTAXII) - source and issues
- [OpenTAXII documentation](https://opentaxii.readthedocs.io/en/latest/) - install, configuration, docker pages
- [Changelog](https://github.com/EclecticIQ/OpenTAXII/blob/master/CHANGES.rst) - TAXII version support history
- [OpenCTI TAXII 2 connector](https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/taxii2) - future consumer of this server
