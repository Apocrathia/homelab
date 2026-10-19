# Tenzir architecture in this homelab

The homelab stack, node by node and plane by plane. This module is the
local wiring; the node READMEs are the wiring manifests' narrative.
Vendored docs for the general shapes: node
[configuration](../skills/tenzir/reference/node/configuration.md), OCSF
[mapping](../skills/tenzir/guides/normalize/map-to-ocsf.md),
[sigma](../skills/tenzir/guides/detect/execute-sigma-rules.md), pipeline
[troubleshooting](../skills/tenzir/guides/troubleshooting/).

## Nodes

Seven standalone Tenzir nodes in namespace `tenzir` — Tenzir has no
distributed mode, so each node is a process with its own lake and its own
pipelines ([core](../../nodes/core/README.md),
[tetragon](../../nodes/tetragon/README.md),
[netflow](../../nodes/netflow/README.md),
[investigations](../../nodes/investigations/README.md),
[enrichment](../../nodes/enrichment/README.md),
[introspection](../../nodes/introspection/README.md),
[intel](../../nodes/intel/README.md)). All register into one hosted
Tenzir Platform workspace (app.tenzir.com) over a single outbound
WebSocket; pipelines run entirely on the nodes and events never route
through the platform.

- **Core node** — the detection plane. Normalizes every feed except the
  tetragon flood and the netflow ingest (kube-apiserver audit,
  authentik, fleet, trivy) onto the unified `ocsf` bus and runs the one
  sigma pass. Fourteen pipelines live in its HelmRelease.
- **Tetragon node** — owns only the tetragon export flood so its CPU and
  memory behavior cannot starve the detection plane. Six pipelines (OTLP
  ingest + OCSF map, the geo-open loader, and the three observability
  arms), subprocess-isolated so a pipeline blowup dies alone.
- **Netflow node** — owns only the NetFlow collector (UniFi exporters
  behind `tenzir-ingest-lb`, moved off the core node 2026-10-17). One
  collector pipeline (UDP accept + OCSF map via the vendored library
  package) plus the pipeline-metrics, error-diagnostics, and
  Loki-diagnostics shippers; its 4001 class feeds its own
  node-local archive rule, tetragon-style.
- **Investigations node** — owns the agent investigations plane:
  case/evidence envelopes in, `investigations.records` on ClickHouse
  out — an isolated blast radius the detection plane never shares.
- **Enrichment node** — the internal-reference-data factory, shipped
  idle in lap 1 (no ingest); lap 2 shipped its first factory pipeline,
  fleet-assets-pull (the hourly Fleet host inventory into
  `ocsf.fleet_assets`, consumed by the core node's fleet-assets-loader);
  later factory lanes build the curated lookup tables — fleet assets,
  baselines — into ClickHouse for the other nodes' loaders;
  live-event enrichment stays in-stream at the ingress nodes.
- **Intel node** — the CTI factory plane: its opencti-taxii-factory
  pipeline pulls external threat intel from OpenCTI's TAXII 2.1
  indicator collection, normalizes it to OCSF 5021, and appends it to
  the ClickHouse OCSF store, from where the core node's
  opencti-osint-loader pulls the table into its node-local
  `ocsf-osint` context; the node alone runs the rc engine
  (`v6.20.0-rc.3`, GA bump via renovate).

## Detection plane

Feeds publish OCSF-normalized events onto the `ocsf` topic and the
`sigma-detect` pipeline evaluates rules as events arrive, with
`mapping="auto"`: per-schema behavior, and a rule whose fields do not
resolve for a schema is skipped with one warning per revision, never
weakened. Detection Findings (2004) are stamped with a stable uid (rule
id + subject fingerprint) by
[`findings/stamp.tql`](../../packages/homelab/operators/findings/README.md)
and imported into the lake; trivy's ExposedSecretReport findings ride the
same stamp. Homelab sigma rules are written against OCSF field paths; the
vendored SigmaHQ kubernetes-audit corpus names raw audit fields, has no
OCSF projection, and stays parked. Bus semantics and the class taxonomy:
[`detections/README.md`](../../detections/README.md).

## Storage plane

15-minute local lake on each node — a transit buffer between ingest and
the archive, not a query surface. Archive-then-expire: every mappable
class exports to the ClickHouse OCSF query store (per-class
`ocsf.<Class_Name>` tables) and expires locally; ClickHouse is the
record. The retired `s3://tenzir/ocsf/` parquet archive stays untouched
in the rustfs bucket as frozen history — deleting it is a separate
operator call. Classes that cannot name themselves (the Base Event
fallback) are not archived — they expire with the window. The compaction
pass runs every 5 minutes on core, tetragon, and netflow, and the true
window at pass boundaries is 15-20 minutes on all three: the 15-minute
expiry plus the pass interval, with each node's 60-second partition
flush adding almost nothing.

## SQL plane (Grafana + ClickHouse)

Querying and alerting live in Grafana over the `ocsf-clickhouse`
datasource on the ClickHouse OCSF store, reading the per-class `ocsf.*`
tables directly — the MotherDuck datasource and the duckdb/parquet lane
retired with the MR-5 teardown. Grafana owns notifications; there is no
other findings egress — the Discord doorbell and the Loki findings
projection were cut with the zero-egress restructure. The three
dashboards live in [`grafana/`](../../grafana/README.md).

## Metrics plane (push-only)

The nodes push their own operational metrics; there is no scrape
endpoint on them. All four pipeline-carrying nodes (core, tetragon,
netflow, investigations) ship the same three arms.
`pipeline-metrics-to-mimir` pushes the `tenzir_pipeline_*` ingress and
egress series with a `node` and `internal` label each — the
`pipeline_id` label is the bare pipeline id, so the `node` label keeps
same-id pushers distinct, and `internal` separates bus-internal flow
from external export. `error-diagnostics-to-mimir` pushes an error and
a warning sample per live diagnostic (`tenzir_pipeline_errors` /
`tenzir_pipeline_warnings`). `diagnostics-to-loki` ships every live,
not-hidden pipeline diagnostic to Loki as `job=tenzir-diagnostics`
log lines via `to_fluent_bit` (the ANSI `rendered` field dropped, the
rest of the record verbatim, the node baked into the stream labels).
Core adds `sigma-metrics-to-mimir` (`tenzir_sigma_*` — sigma runs only
there). The enrichment node shipped its first pipeline in lap 2
(fleet-assets-pull) but no metrics arms yet — it must gain the same
set in a later lap so the dashboard shows the factory's own
pipelines. The Grafana
Node Pipelines dashboard reads the series in Mimir; the receiving stack
is outside this subtree.

## Sources

- [`README.md`](../../README.md) — topology, three-plane model
- [`nodes/core/README.md`](../../nodes/core/README.md) — detection plane
  pipelines, sizing, retention
- [`nodes/tetragon/README.md`](../../nodes/tetragon/README.md) — flood
  node, subprocess isolation
- [`detections/README.md`](../../detections/README.md) — bus, sigma
  semantics, class taxonomy
- [`grafana/README.md`](../../grafana/README.md) — dashboards, ClickHouse
  datasource
