# OpenAEV

OpenAEV (formerly OpenBAS) is Filigran's open-source Adversarial Exposure
Validation platform: attack simulations and tabletop exercises with coverage
measurement — the red-teaming sibling of Promptfoo and PyRIT.

> **Navigation**: [← Back to Artificial Intelligence README](../README.md)

## Overview

- **openaev** — platform pod (API + React SPA + websockets) plus its CNPG
  PostgreSQL cluster; Flyway migrates the schema on boot
- **openaev-opensearch** — single-node OpenSearch engine, security plugin off
  (official compose parity), CNP-locked to the platform pod
- **openaev-rabbitmq** — RabbitMQ broker with the upstream-mandated
  `rabbitmq.conf` (512MB max message, 24h consumer timeout)
- Object storage rides the NAS RustFS instance — no in-cluster MinIO
- **URL**: `https://openaev.gateway.services.apocrathia.com`
- Sizing, image digests, probes: the manifests in this directory are the
  source of truth

## Configuration

Env-only; the admin is seeded from `OPENAEV_ADMIN_*` at boot — no first-run
wizard. Everything else is set up in the web UI after login. See
`helmrelease.yaml` for the full env list.

**Before applying**, create the 1Password item
`vaults/Secrets/items/openaev-secrets` with fields:

- `username`, `password` — PostgreSQL app credentials
- `admin-email`, `admin-password` — breakglass admin login
- `admin-token` — UUIDv4; admin API/agent token
- `encryption-key`, `encryption-salt` — DB encryption key derivation
- `healthcheck-key` — UUID; gates `/api/health`
- `rustfs-access-key`, `rustfs-secret-key` — scoped keys for RustFS bucket
  `openaev` (create the bucket and keys on the NAS first)
- `rabbitmq-user`, `rabbitmq-pass` — broker credentials
- `oidc-client-id`, `oidc-client-secret` — filled post-merge (below)

## Authentication

Authentik OIDC (confidential + PKCE), plus the seeded local admin as the
breakglass login when Authentik is down.

**Post-merge step**: the blueprint creates the OAuth2 provider in Authentik
and generates the client id/secret. Copy both into the `oidc-client-id` /
`oidc-client-secret` fields of the `openaev-secrets` item, then restart the
platform pod.

## Telemetry

Upstream telemetry has no opt-out; it posts version, server IP, and usage
counts to `telemetry.oaev.filigran.io` every 6 hours. The `openaev-egress`
CNP blocks that host (and all world egress), so the exporter self-disables.

## SSO license watch

OIDC is Community Edition in 3.261016.0 (verified in upstream source). OpenCTI
moved SSO config into the UI behind an Enterprise Edition gate — if OpenAEV
does the same, expect SSO to need a license. Re-verify on major bumps.

## Troubleshooting

```bash
kubectl get pods -n openaev
kubectl logs -n openaev deployment/openaev -f
kubectl get ciliumnetworkpolicy -n openaev
```

- Pod won't boot: invalid/missing admin env (token must be UUIDv4) fail-fasts
  by design; check the `InitAdminCommandLineRunner` lines in the logs.
- RabbitMQ queues reset when the broker pod is recreated (new hostname =
  fresh node store); in-flight messages are lost, container restarts keep them.
- Mail is unconfigured: upstream defaults to a dummy `smtp.gmail.com`; sends
  fail silently unless set up in-app later.

## References

- [Documentation](https://docs.openaev.io) · [Repository](https://github.com/OpenAEV-Platform/openaev)
