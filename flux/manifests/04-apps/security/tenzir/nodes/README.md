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
- [`enrichment/`](./enrichment/README.md): the fleet's context factory
  (curated lookup tables — fleet assets, threat intel, baselines — into
  ClickHouse; the first row — OpenCTI TAXII threat intel — has its
  table and the core node's loader shipped, with the factory row
  itself pending engine 6.20)
- [`introspection/`](./introspection/README.md): the diagnostics
  observability plane (the node's local diagnostics pair plus the
  central poller Deployment that ships every fleet node's diagnostics
  to Loki and Mimir)

Adding a node is a recipe, not a design exercise: see
[`core/README.md`](./core/README.md#adding-a-node).
