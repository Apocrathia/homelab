# Grafana

Three dashboards, each in its own ConfigMap generated from the matching
JSON, all in the Grafana `Security` folder:

- **Tenzir Node Pipelines** ([`dashboard.json`](./dashboard.json)) — the
  six-panel operations view of the node's own metrics
  (`tenzir_pipeline_*`, `tenzir_sigma_*`, and the error series the node's
  metrics pipelines push to Mimir).
- **Tenzir OCSF Exploration** ([`ocsf-exploration.json`](./ocsf-exploration.json))
  — the cross-class hunt over the `s3://tenzir/ocsf/` archive: event rate
  by `class_uid`, severity distribution, and per-class panels (k8s audit
  API Activity 6003, authentik Authentication 3002 / Account Change 3001,
  tetragon Process Activity 1007 / File System Activity 1001 / Network
  Activity 4001, netflow 4001, trivy Vulnerability Finding 2002).
- **Tenzir OCSF Findings** ([`ocsf-findings.json`](./ocsf-findings.json))
  — Detection Finding (2004) surfacing: severity over time, rules,
  affected subjects, the findings table (stamp fields), and the sigma
  evidence detail (acting user and matched k8s object).

The OCSF dashboards query the `tenzir-ocsf` MotherDuck datasource, whose
initSql exposes the `ocsf` view over the class-partitioned parquet, so they
render empty until the archive parquet flows and every panel reads real
archived fields only.
