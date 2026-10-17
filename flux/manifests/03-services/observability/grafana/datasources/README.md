# Grafana datasources

GrafanaDatasource CRs the [grafana operator](../helmrelease.yaml) syncs into
the kube-prometheus-stack Grafana instance. Secrets never land in git: each CR
carries `${field-name}` placeholders, and the operator substitutes them from
the `grafana-secrets` Secret (1Password item
`vaults/Secrets/items/grafana-secrets`) via `valuesFrom` — git only ever names
fields, never values.

> **Navigation**: [← Back to Grafana README](../README.md)

| Datasource        | File                   | Type                          | Notes                                                          |
| ----------------- | ---------------------- | ----------------------------- | -------------------------------------------------------------- |
| `homeassistant`   | `home-assistant.yaml`  | influxdb                      | Home Assistant InfluxQL                                        |
| `ocsf-clickhouse` | `ocsf-clickhouse.yaml` | grafana-clickhouse-datasource | OCSF query store in `clickhouse` via the pinned catalog plugin |

## `ocsf-clickhouse`

Rollout plan MR-2 ([docs/plans/clickhouse-rollout.md](../../../../../../docs/plans/clickhouse-rollout.md)):
Grafana queries the ClickHouse OCSF store deployed by the MR-1 lane
([`clickhouse-tenzir` CR-level Service](../../clickhouse/)) through the
first-party `grafana-clickhouse-datasource` plugin, pinned `4.20.0` via the
kube-prometheus-stack `grafana.plugins:` chart value (the deployed grafana
image does not bundle it). Connection uses the plugin's default native
protocol on port 9000; the service also exposes HTTP 8123. Auth is the
`grafana` ClickHouse user defined in `chi.yaml` (SELECT-only on `ocsf.*`),
substituted from `grafana-secrets` fields `clickhouse-grafana-user` and
`clickhouse-grafana-password` — the password value must match the
`clickhouse-grafana-password` field on the `tenzir-secrets` item that
materializes the `clickhouse-secrets` Secret in `clickhouse`.
