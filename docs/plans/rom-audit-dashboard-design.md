---
title: "rom-audit — Grafana dashboard"
status: active
found_at: 2026-07-29
updated_at: 2026-07-29
area: apps
---

# rom-audit Grafana dashboard

Report-only CronJob already emits NDJSON to Loki. This adds a Grafana
dashboard (health + library quality) provisioned the same way as Fleet.

## Goal

One dashboard in folder **Games** so an operator can answer, after a run:

- Did systems fail hard (`systems_error`, DAT/path errors)?
- How many ROMs matched / unknown / wrong_name?
- Which systems and files need attention?

## Decisions

| Decision        | Choice                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------- |
| Scope           | Both job health and library quality (one screen)                                              |
| Folder          | `Games` (created via `spec.folder` if missing)                                                |
| Provisioning    | Fleet clone: JSON → ConfigMap → `GrafanaDashboard` CR                                         |
| Datasource      | Template var `loki` → `"uid": "${loki}"`                                                      |
| Default range   | 30d (weekly schedule + one-shots)                                                             |
| Stream selector | Prefer `container_runtime="containerd"` and/or `max by (pod)` — Alloy can double-ship streams |

## Layout on disk

Under `flux/manifests/04-apps/games/rom-audit/`:

```text
grafana/
  dashboard.json       # source of truth for panels
  kustomization.yaml   # ConfigMap rom-audit-dashboard → prometheus-system
  grafana.yaml         # GrafanaDashboard CR, folder: Games
```

Parent `rom-audit/kustomization.yaml` gains `- grafana/`.

### Grafana CR (shape)

```yaml
apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDashboard
metadata:
  name: rom-audit
  namespace: prometheus-system
spec:
  instanceSelector:
    matchLabels:
      app.kubernetes.io/name: grafana
      app.kubernetes.io/instance: kube-prometheus-stack
  configMapRef:
    name: rom-audit-dashboard
    key: dashboard.json
  folder: Games
```

ConfigMap generator mirrors Fleet (`disableNameSuffixHash: true`,
`namespace: prometheus-system`).

## Log model (existing)

Selector: `{namespace="rom-audit", container="rom-audit"}` (+ `container_runtime`
when needed).

| `event`          | Useful fields                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `run_summary`    | `matched`, `wrong_name`, `unknown`, `total`, `systems_ok`, `systems_error`, `systems_skipped`, `level` |
| `system_summary` | `system`, `status` (`ok`/`error`/`skipped`), counts or `message`                                       |
| `file`           | `status`, `system`, `path`, `expected_name`, `crc32`, `message`                                        |
| `run_start`      | `systems`, `library_root` (optional; not required for v1 panels)                                       |

No `duration_ms` / `run_id` / missing-from-DAT inventory. Do not invent panels
for those.

## Panels (9)

Validated against live Loki. Per-system views are **tables** (Fleet-style
`labelsToFields`) — Loki instant series do not label Stat/BarGauge cleanly
(`Value #A`). Classification stats use `byFrameRefID` display names and
`max(max by (pod) (...))` so a full CronJob wins over small one-shots.

1. **Classification totals** — Stat — matched / unknown / wrong_name / total
2. **Systems health** — Stat — ok / error / skipped
3. **Matched by system** — Table — `system_summary` status=ok
4. **Unknown by system** — Table
5. **Wrong-name by system** — Table
6. **File status mix** — Donut — `event=file` by status (incl. `inventory` if present)
7. **Unknown files** — Logs
8. **Wrong-name files** — Logs
9. **System errors / skipped** — Logs

## Out of scope

- Pod label fixes (`app.kubernetes.io/name` on CronJob) — nice later, not required
- Alerting rules
- Alloy structured_metadata promotion
- grafana.com import / sidecar-only ConfigMaps
- Changing the Python emitter schema

## Verify

- `kustomize build` on `rom-audit` includes ConfigMap + CR
- yamllint / Trivy on changed paths
- After apply (operator): dashboard under Games; panels populate with
  `$__range` ≥ last Job; duplicate Alloy streams do not double counts

## Reference

- Fleet pattern: `flux/manifests/04-apps/management/fleet/grafana/`
- App LogQL notes: `flux/manifests/04-apps/games/rom-audit/README.md`
- Parent plan: [`rom-audit.md`](./rom-audit.md)
