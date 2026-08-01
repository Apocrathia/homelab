---
title: "Gatus — in-cluster uptime monitoring"
status: done
found_at: 2026-08-01
updated_at: 2026-08-01
area: observability
---

# Gatus — in-cluster uptime monitoring

Complementary synthetic monitoring for workloads **inside** the cluster.
Does not replace Uptime Kuma (LAN/network services) or Uptime Robot
(external inbound checks).

## Goal

Deploy [Gatus](https://github.com/TwiN/gatus) with
[gatus-sidecar](https://github.com/home-operations/gatus-sidecar) so
in-cluster Service health is GitOps-defined, scraped into Prometheus, and
visible behind Authentik. Prove the pattern on `demo-app`, then expand.

## Scope

**In scope (v1) — shipped:**

- Official home-operations `gatus-sidecar` Helm chart (Gatus + sidecar)
- Placement under platform observability (`services-gatus`)
- Authentik proxy UI at `https://gatus.gateway.services.apocrathia.com`
- CNPG Postgres for Gatus storage
- Sidecar `--enable-service` (annotation opt-in only)
- ServiceMonitor + Grafana dashboard 24379 + endpoint-down alert (5m → Discord)
- Kustomize-owned base ConfigMap
- First consumer: `demo-app` via `generic-app` `gatus:` values

**Phases (post-ship):**

| Phase | Scope                                             | Status                                                                      |
| ----- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| 1     | Gatus + chart `gatus:` (default false) + demo-app | Done                                                                        |
| 2     | First wave on selected generic-app apps           | [`gatus-annotate-app-wave`](../issues/gatus-annotate-app-wave.md)           |
| 3     | Flip chart default to `enabled: true` (opt-out)   | [`gatus-generic-app-default-on`](../issues/gatus-generic-app-default-on.md) |
| 4     | Non-generic-app Helm gaps                         | [`gatus-non-generic-app-gaps`](../issues/gatus-non-generic-app-gaps.md)     |

## Decisions

| Decision                    | Choice                                           | Why                                                                                                |
| --------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Role vs Kuma / Uptime Robot | Complement                                       | Different scopes — LAN / external / in-cluster                                                     |
| Chart                       | Official `gatus-sidecar` chart                   | Maintained Gatus+sidecar pairing, RBAC, ServiceMonitor                                             |
| Sidecar model               | One sidecar in the Gatus pod only                | Watches API; does **not** inject into apps                                                         |
| Discovery                   | `--enable-service` only                          | Opt-in via `gatus.home-operations.com/enabled`; avoids Authentik false greens from hostname probes |
| UI auth / exposure          | Authentik proxy; chart `httpRoute`/`ingress` off | Matches other platform apps; outpost owns route                                                    |
| Config                      | Kustomize ConfigMap → `config.existingConfigMap` | Chart never renders config; we own the YAML                                                        |
| Storage                     | CNPG `Cluster` in `gatus` namespace              | Native Gatus `storage.type: postgres`; matches Renovate/Authentik                                  |
| App PVC                     | None                                             | History in Postgres; sidecar uses emptyDir for generated YAML                                      |
| Metrics / alerts            | ServiceMonitor + Grafana CRs                     | 5m Discord (firing-only); 1h Homelab Agent                                                         |
| Dashboard                   | grafana.com 24379                                | Uses `gatus_results_*` series                                                                      |
| First target                | `demo-app` Service annotation                    | Prove in-cluster Service probe path                                                                |
| Flux wiring                 | Own Kustomization `services-gatus`               | Avoid hanging all of `services-observability` on CNPG                                              |
| Helm source                 | Reuse `tuppr` OCI HelmRepository                 | Same `oci://ghcr.io/home-operations/charts` registry                                               |
| demo-app annotations        | `generic-app` `gatus:` values (≥ 0.0.75)         | Chart stamps Service annotations; postRenderer retired                                             |

## Layout on disk

```text
flux/manifests/03-services/observability/gatus/
  namespace.yaml
  postgres.yaml
  secret.yaml
  configmap.yaml
  authentik-blueprint.yaml
  icon.svg
  helmrelease.yaml
  grafana.yaml                 # folder, dashboard 24379, alert, route
  kustomization.yaml
  flux-kustomization.yaml      # name: services-gatus
  README.md
```

## Architecture

```text
demo-app Service (+ annotation)
        │ watch
        ▼
 gatus-sidecar ──write──▶ /config/gatus-sidecar.yaml
 ConfigMap (base) ───────▶ /config/config.yaml
        │
        ▼
     Gatus ──▶ UI (Authentik proxy)
           ──▶ /metrics (ServiceMonitor → Prometheus / Grafana)
           ──▶ CNPG (history)
```

## Steps

- [x] Confirm OCI/Helm source (reuse `tuppr` HelmRepository)
- [x] Scaffold `observability/gatus/`
- [x] Add `services-gatus` Flux Kustomization + root registration
- [x] Annotate `demo-app` via `generic-app` `gatus:`; verify green + alert on scale-to-0
- [x] ServiceMonitor + Grafana dashboard 24379 + 5m Discord alert
- [x] Operator README
- [x] File follow-on issues (generic-app `gatus:` values, app wave)

## Feedback loop

- `kustomize build` on `observability/gatus/`
- `helm template` against chart 0.4.0
- Live: Authentik UI, demo-app green, Discord on scale-to-0 for 5m

## Notes

- Service probes default to `tcp://` — set `url: http://…` for HTTP status checks.
- Sidecar ≠ per-app injection.
- Hostname / HTTPRoute probes deferred (Authentik false greens).
