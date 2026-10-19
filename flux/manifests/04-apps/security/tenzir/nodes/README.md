# Nodes

One Tenzir node = one process = one folder. Each folder carries its
HelmRelease, its kustomization, and a README with the node's own
connectivity chart, sizing math, and retention profile.

- [`core/`](./core/README.md): the detection plane, every feed that is not
  the tetragon flood or the netflow ingest
- [`tetragon/`](./tetragon/README.md): the tetragon export flood isolate
- [`netflow/`](./netflow/README.md): the NetFlow collector isolate (UniFi
  exporters behind `tenzir-ingest-lb`)
- [`investigations/`](./investigations/README.md): the agent investigations
  plane (case/evidence records, isolated blast radius)
- [`enrichment/`](./enrichment/README.md): the internal-reference-data
  factory (curated lookup tables — fleet assets, baselines — into
  ClickHouse; idle and empty until its first row)
- [`introspection/`](./introspection/README.md): the diagnostics
  observability plane (the node's local diagnostics pair plus the
  central poller Deployment that ships every fleet node's diagnostics
  to Loki and Mimir)
- [`intel/`](./intel/README.md): the CTI factory plane (OpenCTI TAXII
  threat intel pulled into the `ocsf.OSINT_Inventory_Info` ClickHouse
  table on the rc engine image; the core node's loader is the consumer
  half)

Adding a node is a recipe, not a design exercise: see
[`core/README.md`](./core/README.md#adding-a-node).
