---
title: "Migrate Grafana from Authentik proxy to OIDC"
kind: feature
status: open
severity: medium
source: human
found_at: 2026-08-02
found_by: security-review-2026-08-01
area: observability
slice: hitl
---

# Migrate Grafana from Authentik proxy to OIDC

## Problem / desired state

Grafana is fronted by an Authentik **proxy** outpost with broad
`skip_path_regex` entries (`^/api/`, `^/mcp`, `^/sse`) so MCP and API clients
can work without SSO cookies. That leaves the Grafana HTTP API outside
Authentik session checks.

Desired state: Grafana uses Authentik as an **OIDC** provider (app-native
login), the proxy outpost and `skip_path_regex` go away, and MCP/API access
relies on Grafana auth (service accounts / tokens) rather than proxy path
skips. HTTPRoute (or equivalent) points at Grafana directly, same pattern as
other OIDC apps (Headlamp, Immich, policy-reporter, etc.).

## Repro

N/A (feature). Current proxy + skips:

- `flux/manifests/02-infrastructure/kube-prometheus-stack/authentik-blueprint.yaml`
  (`skip_path_regex` on `/api/`, `/mcp`, `/sse`)
- `flux/manifests/02-infrastructure/kube-prometheus-stack/helmrelease.yaml`
  (`auth.proxy` / `GF_AUTH_PROXY_*`)

## Acceptance

- Grafana `auth.generic_oauth` (or current Grafana OIDC settings) configured
  against Authentik; proxy auth disabled.
- Authentik Grafana provider is OIDC (not proxy); proxy outpost removed or
  unused; blueprint no longer sets `skip_path_regex` for Grafana.
- Browser login to `grafana.gateway.services.apocrathia.com` works via OIDC.
- Grafana MCP / API clients still work via Grafana service accounts (or
  documented token path) without Authentik path skips.
- No Authentik outpost HTTPRoute sitting in front of Grafana solely for proxy
  auth.

## Feedback loop

- `yamllint` on changed kube-prometheus-stack / Authentik blueprint YAML.
- Render / diff HelmRelease values for Grafana auth section.
- Browser: OIDC login + logout on the Grafana hostname.
- Call a Grafana `/api/` endpoint without an Authentik session: expect Grafana
  auth failure (401/403), not an unauthenticated success.
- Confirm MCP (or equivalent) still works with a Grafana service-account token.
- Read-only: `kubectl get httproute -A` / Authentik outpost list — no leftover
  Grafana proxy outpost route (operator-led).

## Implementation hint

Mirror an existing Authentik OIDC app in-repo (e.g. Headlamp or Immich):
OnePassword Item for client id/secret, Grafana `grafana.ini` /
`GF_AUTH_GENERIC_OAUTH_*` (or chart `grafana.ini` oauth block), switch blueprint
from `ProxyProvider` to OAuth2/OIDC provider, point Gateway HTTPRoute at the
Grafana Service, delete proxy outpost + `GF_AUTH_PROXY_*`. Preserve group →
Grafana org/role mapping if you rely on `X-authentik-groups` today.

## Notes

- Raised from full-repo security review
  (`docs/security/security-review-2026-08-01.md`, SEC-002); operator chose
  OIDC migration over narrowing skip regex.
- Do not put OIDC client secrets in Git — OnePassword Item only.
