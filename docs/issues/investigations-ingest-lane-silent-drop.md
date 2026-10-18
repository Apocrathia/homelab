---
title: "investigations ingest lane silently drops accepted events"
kind: bug
severity: high
status: open
source: agent
found_at: 2026-10-18
area: observability
slice: hitl
---

# investigations ingest lane silently drops accepted events

The standing `investigations-ingest-http` pipeline accepts case/evidence
envelopes (HTTP 200) but the events never reach `investigations.records`.
Found during the GATE 7 insert smoke of the ocsf ClickHouse repair lap
([`ocsf-clickhouse-ddl-convergence-and-broken-parts.md`](./ocsf-clickhouse-ddl-convergence-and-broken-parts.md)),
where every other part of the lane's dependencies was verified clean first.

## Evidence (2026-10-18, live)

- Two benign case-open POSTs (`case_uid` `ocsf-repair-smoke-20261018` and
  `-b`) to the lane via port-forward: HTTP 200 in ~40 ms both times
  (`accept_http` documented behavior — the 200 alone proves nothing).
- Read-back: `investigations.records` = 0 rows on BOTH replicas.
- Node API (`/api/v0/pipeline/list`): pipeline state `running`, error `""`,
  `diagnostics: []`, `total_runs` stable at 104 (all pre-repair restarts),
  `start_time` 04:36:28Z — healthy, NOT crash-looping.
- Live diagnostics capture around POST #2 (a `diagnostics live=true | head`
  reader + serve window): ZERO events — no map assert warnings, no insert
  errors.
- ClickHouse side: `system.query_log` shows the `investigations-writer` user
  issuing ONLY `EXISTS TABLE investigations.records` probes (4x at
  04:36:40Z, 1x at 04:37:28Z, then quiet). **No `INSERT` statement from that
  user has ever reached either replica.**
- `to_clickhouse` `batch_timeout` defaults to 1 s (vendored docs), so the
  flush should have landed within seconds of each POST.
- The table side is proven clean: full convergence matrix vs the shipped DDL
  (11 tables, every column, zero divergences on both replicas) and all
  columns append-compatible per the vendor type list (Int8/UInt32/String/
  JSON/DateTime64 — the UInt8-era blockers the repair fixed are gone).

## Hypotheses

- A payload/schema mismatch silently drops the event inside the
  map → `ocsf_derive` → `ocsf_cast` → `to_clickhouse` chain without the
  diagnostics that assert-failures should emit.
- The connector holds a stale schema/table description cache from the outage
  era (the table did not exist for the whole 104-run failure stretch) and
  never recovers without a pipeline restart past it.
- End-to-end of this lane was **never previously proven**: the original
  investigations smoke failed at table-not-exist, which is what filed the
  ocsf issue. The table side of that failure is now fixed; this is the next
  layer behind it.

## Desired state

POSTed envelopes land in `investigations.records` and read back through the
query lane, within the `batch_timeout` window, with no silent drops: either
the event is written, or the lane rejects it loudly (diagnostics + non-200
where possible per `accept_http` limits).

## Repro

POST a minimal case-open envelope
(`{"kind": "case", "action": "open", "title": "..."}`) to
`tenzir-node-investigations.tenzir.svc.cluster.local:8080`, wait 5 s, query
`investigations.records` on either replica: 0 rows.

## Notes

- Repair-lap context and the full green matrix for everything else:
  [`ocsf-clickhouse-ddl-convergence-and-broken-parts.md`](./ocsf-clickhouse-ddl-convergence-and-broken-parts.md).
- Do not chase this by mutating tenzir node/pipeline config without a new
  operator-authorized lap (standing rule from this repair).
