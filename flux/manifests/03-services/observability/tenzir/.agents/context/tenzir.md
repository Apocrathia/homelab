# Tenzir

What the product is, what runs in this homelab, and where the durable
guidance lives.

## The product

Tenzir is a security data pipeline platform: TQL pipelines turn telemetry
into normalized events. Nodes are standalone processes — each with its own
lake and its own pipelines; there is no distributed mode.

## This homelab

Synthesized from the subtree's READMEs (sources at the bottom):

- Three standalone nodes in namespace `tenzir`: the
  [core node](../../nodes/core/README.md) is the detection plane — it
  normalizes kube-apiserver audit, authentik, fleet, and trivy feeds onto
  a unified OCSF bus, runs the one sigma pass over it, and owns the
  archive. The [tetragon node](../../nodes/tetragon/README.md) owns only
  the tetragon export flood, and the [netflow
  node](../../nodes/netflow/README.md) owns only the NetFlow collector
  (UniFi exporters behind `tenzir-ingest-lb`), so neither feed's behavior
  can starve detection.
- Three planes (detail in [`architecture.md`](./architecture.md)): live
  detection runs in-node; findings and events live in the one OCSF dataset
  at `s3://tenzir/ocsf/` (class-partitioned parquet on rustfs — the
  record); querying and alerting run in Grafana over MotherDuck, which
  reads the parquet directly.
- All three nodes register into one hosted Tenzir Platform workspace
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
- [`detections/README.md`](../../detections/README.md) — bus semantics,
  sigma mapping, class taxonomy
