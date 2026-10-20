# Tenzir

What the product is, what runs in this homelab, and where the durable
guidance lives.

## The product

Tenzir is a security data pipeline platform: TQL pipelines turn telemetry
into normalized events. Nodes are standalone processes — each with its own
lake and its own pipelines; there is no distributed mode.

## This homelab

Synthesized from the subtree's READMEs (sources at the bottom):

- Seven standalone nodes in namespace `tenzir`: the
  [core node](../../nodes/core/README.md) is the detection plane — it
  normalizes kube-apiserver audit, authentik, fleet, and trivy feeds onto
  a unified OCSF bus, runs the one sigma pass over it, and owns the
  archive. The [tetragon node](../../nodes/tetragon/README.md) owns only
  the tetragon export flood, and the [netflow
  node](../../nodes/netflow/README.md) owns only the NetFlow collector
  (UniFi exporters behind `tenzir-ingest-lb`), so neither feed's behavior
  can starve detection. The [investigations
  node](../../nodes/investigations/README.md) owns the agent
  investigations plane (case/evidence envelopes in,
  `investigations.records` on ClickHouse out). The [enrichment
  node](../../nodes/enrichment/README.md) is the internal-reference-data
  factory: it builds curated lookup tables — fleet assets, baselines —
  into ClickHouse for the other nodes' loaders; lap 2 shipped its
  first lane, `fleet_assets` (hourly Fleet host inventory into
  `ocsf.fleet_assets`; the core node's loader consumes it) — no
  ingest, and live-event enrichment stays in-stream at the ingress
  nodes. The [introspection
  node](../../nodes/introspection/README.md) is the fleet's diagnostics
  poller plane. The [intel
  node](../../nodes/intel/README.md) is the CTI factory plane: its
  opencti-taxii-factory-walk / -poll pipelines pull external threat intel from
  OpenCTI's TAXII 2.1 indicator collection, normalizes it to OCSF 5021,
  and appends it to the ClickHouse OCSF store, from where the core
  node's opencti-osint-loader pulls it into its node-local
  `ocsf-osint` context.
- Three planes (detail in [`architecture.md`](./architecture.md)): live
  detection runs in-node; findings and events live in the ClickHouse OCSF
  query store (per-class `ocsf.<Class_Name>` tables — the record);
  querying and alerting run in Grafana over its ClickHouse datasource
  reading the `ocsf.*` tables directly.
- All seven nodes register into one hosted Tenzir Platform workspace
  (app.tenzir.com) over a single outbound WebSocket; pipelines run
  entirely on the nodes and never route events through the platform.
- Content ships as ConfigMaps from this folder (the `homelab` TQL package
  and the sigma rules) and mounts read-only into the nodes' pods.

## Library-first

Durable guidance: before writing any new TQL operator, OCSF mapping, or
detection package in this homelab, check
[github.com/tenzir/library](https://github.com/tenzir/library) first —
leverage its packages wherever possible instead of inventing our own.
Vendored pointers: [package guides](../skills/tenzir/guides/packages/)
and [`package_add`](../skills/tenzir/reference/operators/package_add.md)
(installing packages); detail and the netflow precedent in
[`packages.md`](./packages.md).

## DeepWiki

Code-level questions beyond the vendored docs:

- [deepwiki.com/tenzir/tenzir](https://deepwiki.com/tenzir/tenzir) — the
  platform repo (wiki just refreshed)
- [deepwiki.com/tenzir/skills](https://deepwiki.com/tenzir/skills) — this
  skills repo (indexing just requested)
- [deepwiki.com/tenzir/library](https://deepwiki.com/tenzir/library) —
  Tenzir's package library (indexing just requested)

## Pointers

- [Vendored tenzir docs](../skills/tenzir/SKILL.md) — TQL, operators,
  functions, integrations, deployment
- [Vendored OCSF reference](../skills/tenzir-ocsf/SKILL.md) — classes,
  objects, profiles, versions
- [Upstream docs](https://tenzir.com/docs/)
- [App folder](../../README.md) — topology, secrets, content wiring

## Sources

- [`README.md`](../../README.md) — topology, three-plane model, secrets,
  content
- [`nodes/core/README.md`](../../nodes/core/README.md) — detection plane
  pipelines, sizing, retention
- [`nodes/tetragon/README.md`](../../nodes/tetragon/README.md) — flood
  node, residue projection
- [`nodes/netflow/README.md`](../../nodes/netflow/README.md) — collector
  node, template-datagram ordering
- [`nodes/investigations/README.md`](../../nodes/investigations/README.md) —
  agent investigations plane, isolated blast radius
- [`nodes/enrichment/README.md`](../../nodes/enrichment/README.md) —
  internal-reference-data factory; first factory lane (fleet_assets)
  shipped in lap 2
- [`nodes/intel/README.md`](../../nodes/intel/README.md) — CTI factory
  plane, OpenCTI TAXII threat intel into ClickHouse
- [`detections/README.md`](../../detections/README.md) — bus semantics,
  sigma mapping, class taxonomy
