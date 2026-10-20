# Grafana

Five dashboards, each in its own ConfigMap generated from the matching
JSON, all in the Grafana `Security` folder:

- **Tenzir Node Pipelines** ([`dashboard.json`](./dashboard.json)) — the
  operations view of the node's own metrics and logs: pipeline rate
  timeseries, a reporting-status state timeline, and error, warning,
  and detection stats over `tenzir_pipeline_*` / `tenzir_sigma_*` in
  Mimir, plus the Node Logs and Pipeline Diagnostics rows over node
  stdout and `job=tenzir-diagnostics` Loki lines.
- **Tenzir OCSF Exploration** ([`ocsf-exploration.json`](./ocsf-exploration.json))
  — the cross-class hunt over the ClickHouse OCSF store: event rate
  by `class_uid`, severity distribution, and per-class panels (k8s audit
  API Activity 6003, authentik Authentication 3002 / Account Change 3001,
  tetragon Process Activity 1007 / File System Activity 1001 / Network
  Activity 4001, netflow 4001, trivy Vulnerability Finding 2002).
- **Tenzir OCSF Findings** ([`ocsf-findings.json`](./ocsf-findings.json))
  — Detection Finding (2004) surfacing: severity over time, rules,
  affected subjects, the findings table (stamp fields), and the sigma
  evidence detail (acting user and matched k8s object).
- **Tenzir Investigations Cases**
  ([`investigations-cases.json`](./investigations-cases.json)) — the
  operator's case list: one row per case with the latest state
  (severity, status, verdict, assignee) aggregated from the append-only
  Incident Finding (2005) lifecycle records, last activity, and record
  count; each `case_uid` cell links to the case detail dashboard.
- **Tenzir Investigations Case Detail**
  ([`investigations-case-detail.json`](./investigations-case-detail.json))
  — the selected case's full record chain in time order: lifecycle
  records and evidence pins with the pinned query + snapshot excerpt,
  the `ai_operation` agent attribution, severity/status evolution, the
  per-record `record_integrity` attestation columns (fingerprint +
  `prev_event` linkage: chained / chain genesis / restart gap /
  pre-epoch), and the evidence observables with their lake row links.

The OCSF dashboards query the `ocsf-clickhouse` datasource over the
per-class `ocsf.*` tables on the ClickHouse OCSF store (the retired
duckdb/parquet lane is gone since the MR-5 teardown), so every panel
reads real archived fields only. The investigations dashboards query
the same datasource over the single-JSON-column `investigations.records`
table (the case store; `grafana` user grants extended for it in
[`../clickhouse/cluster.yaml`](../clickhouse/cluster.yaml)) — see the
datalake README for the [read
contract](../clickhouse/README.md#attestations-on-every-record) behind
the attestation columns.
