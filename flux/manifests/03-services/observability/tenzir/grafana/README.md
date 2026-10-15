# Grafana

The tenzir node-pipelines dashboard: the six-panel view of the node's own
operational metrics (`tenzir_pipeline_*`, `tenzir_sigma_*`, and the error
series the node's metrics pipelines push to Mimir). JSON rides in the
`tenzir-node-pipelines` ConfigMap generated from
[`dashboard.json`](./dashboard.json). This is the operations view, not the
findings view: detection findings live in the `s3://tenzir/ocsf/` dataset
and the security dashboards read it over MotherDuck.
