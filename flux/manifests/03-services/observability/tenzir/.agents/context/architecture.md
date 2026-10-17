# Tenzir architecture in this homelab

The homelab stack, node by node and plane by plane. This module is the
local wiring; the node READMEs are the wiring manifests' narrative.
Vendored docs for the general shapes: node
[configuration](../skills/tenzir/reference/node/configuration.md), OCSF
[mapping](../skills/tenzir/guides/normalize/map-to-ocsf.md),
[sigma](../skills/tenzir/guides/detect/execute-sigma-rules.md), pipeline
[troubleshooting](../skills/tenzir/guides/troubleshooting/).

## Nodes

Three standalone Tenzir nodes in namespace `tenzir` — Tenzir has no
distributed mode, so each node is a process with its own lake and its own
pipelines ([core](../../nodes/core/README.md),
[tetragon](../../nodes/tetragon/README.md),
[netflow](../../nodes/netflow/README.md)). All register into one hosted
Tenzir Platform workspace (app.tenzir.com) over a single outbound
WebSocket; pipelines run entirely on the nodes and events never route
through the platform.

- **Core node** — the detection plane. Normalizes every feed except the
  tetragon flood and the netflow collector (kube-apiserver audit,
  authentik, fleet, trivy) onto the unified `ocsf` bus and runs the one
  sigma pass. Twelve pipelines live in its HelmRelease.
- **Tetragon node** — owns only the tetragon export flood so its CPU and
  memory behavior cannot starve the detection plane. Two pipelines (OTLP
  ingest + OCSF map), subprocess-isolated so a pipeline blowup dies alone.
- **Netflow node** — owns only the NetFlow collector (UniFi exporters
  behind `tenzir-ingest-lb`, moved off the core node 2026-10-17). One
  collector pipeline (UDP accept + OCSF map via the vendored library
  package) plus the two metrics pushers; its 4001 class feeds its own
  node-local archive rule, tetragon-style.

## Detection plane

Feeds publish OCSF-normalized events onto the `ocsf` topic and the
`sigma-detection` pipeline evaluates rules as events arrive, with
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
class exports to `s3://tenzir/ocsf/` as class-partitioned parquet on
rustfs, then expires locally; the parquet is the record. Classes that
cannot name themselves (the Base Event fallback) are not archived — they
expire with the window. The compaction pass runs every 5 minutes on every
node, but the true window at pass boundaries is per-node: 15-25 minutes
on the core node, where the 10-minute partition flush adds up to 10
minutes on top of the 15-minute expiry, and 15-20 minutes on the tetragon
and netflow nodes, whose 60-second flushes add almost nothing.

## SQL plane (Grafana + MotherDuck)

Querying and alerting live in Grafana over MotherDuck, which reads the
parquet directly: the `tenzir-ocsf` MotherDuck datasource exposes the
`ocsf` view over the archive via its initSql. Grafana owns notifications;
there is no other findings egress — the Discord doorbell and the Loki
findings projection were cut with the zero-egress restructure. The three
dashboards live in [`grafana/`](../../grafana/README.md).

## Metrics plane (push-only)

The nodes push their own operational metrics; there is no scrape
endpoint on them. Three pipelines on the core node
(`pipeline-metrics-to-mimir`, `sigma-metrics-to-mimir`,
`error-diagnostics-to-mimir`) push `tenzir_pipeline_*`,
`tenzir_sigma_*`, and the error series to Mimir; the netflow node ships
the pipeline and error pair (a dead UDP collector is a silent black hole,
and its `pipeline_id` label is node-qualified so the series stay
distinct), and the tetragon flood isolate ships none. The Grafana Node
Pipelines dashboard reads the series in Mimir; the receiving stack is
outside this subtree.

## Sources

- [`README.md`](../../README.md) — topology, three-plane model
- [`nodes/core/README.md`](../../nodes/core/README.md) — detection plane
  pipelines, sizing, retention
- [`nodes/tetragon/README.md`](../../nodes/tetragon/README.md) — flood
  node, subprocess isolation
- [`detections/README.md`](../../detections/README.md) — bus, sigma
  semantics, class taxonomy
- [`grafana/README.md`](../../grafana/README.md) — dashboards, MotherDuck
  datasource
