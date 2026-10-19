---
title: "investigations ingest lane silently drops accepted events"
kind: bug
severity: high
status: closed
source: agent
found_at: 2026-10-18
area: observability
slice: hitl
closed_by: 8a160c76f
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

## Root cause (2026-10-19, phase-1 diagnosis)

The drop happened at the SINK — `to_clickhouse`'s typed-column append
mapping — not in `accept_http`/`read_json`, the map, `ocsf_derive`, or
`ocsf_cast`. The OCSF record carries `class_uid` as a signed Tenzir
`int64`; the 12-column `investigations.records` DDL (shipped in
`b659c98f5`, the investigations-plane MR) typed `class_uid` as `UInt32`
(unsigned). Tenzir 6.19.1's append path type-checks signedness against the
loaded table description and treats `int64` vs an unsigned CH column as an
incompatible TYPE — not a range check — and drops the event with a
warning (vendored semantics,
`.agents/skills/tenzir/reference/operators/to_clickhouse.md`: incompatible
values for typed columns produce a warning and drop the affected event; a
dropped batch sends no INSERT).

Primary evidence — node retro diagnostics, run 104 of
`investigations-ingest-http`, 2026-10-18 04:36:40Z:

```text
warning  incompatible type for column `class_uid`
         note: expected `uint64`, got `int64`
         --> <config/investigations-ingest-http>:7:1 to_clickhouse
```

Why the `ocsf.*` data plane never hit this: those tables type `class_uid`
as `Int32` (signed — `cbb02987f`); `investigations.records` was the only
table with an unsigned int column in the record path. POST #1's envelope
traversed the full chain intact and reached the sink; POST #2 never did
(see below).

## Corrections to the 10-18 capture

The "silently" in this issue's title was an instrumentation artifact, not
lane behavior. Three corrections to the 10-18 evidence section above:

- The drop was never silent. Both 10-18 drops emitted WARNING diagnostics
  to the node's diagnostics store (30-day retention): the run-104 type
  warning above, plus `assertion failed: "envelope must name kind: case |
evidence"` at 04:46:21 — POST #2 was additionally malformed (missing
  `kind`) and died at the map assert. The repair lap saw none of this
  because its two diagnostics-reader serve pipelines were created but
  never started (`state: "created"`, `total_runs: 0`), and nobody ran
  `diagnostics retro=true`. Retro capture is now part of the runbook
  discipline: check `diagnostics retro=true` before concluding silence.
- The writer's 10-18 query log is not "EXISTS probes only": `EXISTS
TABLE` + `EXISTS DATABASE` + `DESCRIBE` at 04:36:40 (to_clickhouse's
  documented validate-before-first-write + table-description load), then
  `DESCRIBE` every 30 s for 13+ minutes (marked-table refresh). No INSERT
  ever — a dropped batch sends none. POST #2 generated no writer query at
  all (dropped at the map).

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

## Resolution (2026-10-19)

- **Live fix, operator-side out-of-band (13:30–13:39Z):** the 12-column
  table (0 rows at drop — no data lost) was dropped and
  `investigations.records` rebuilt as the single-JSON-column datalake
  shape: `time DateTime64(9,'UTC') CODEC(Delta,ZSTD)` + `event JSON
COMMENT 'tenzir:catch_all' CODEC(ZSTD(3))`, ReplicatedMergeTree,
  `PARTITION BY toYYYYMM(time)`, `ORDER BY (time)`,
  `storage_policy='tiered'`, `ttl_only_drop_parts=1`, no TTL. The ingest
  pipeline restarted clean (run 110) at 13:40:16Z.
- **Phase-1 verification (14:01Z):** fixture-shaped case-open POST → HTTP
  200, `INSERT INTO investigations.records ("time","event")` in
  `system.query_log` one second after the POST (batch_timeout flush), row
  present and read back on BOTH replicas; intentionally malformed POST →
  HTTP 200 + the map-assert WARNING visible in node retro diagnostics;
  pipeline metrics window ingress=1/egress=1 for the valid POST,
  egress=0 for the malformed one.
- **Git side:** the phase-1 drift concern (git main shipping the stale
  12-column DDL while live carried the fix) was resolved by the
  apps/security restructure — `8a160c76f` — in which
  `investigations.records` was born in the single-JSON shape
  (`flux/manifests/04-apps/security/tenzir/clickhouse/config/10-startup-scripts.xml`).
  Not a phase-2 code MR: the DDL change landed as part of that refactor,
  so no fresh create can re-install the unsigned trap.
- **Phase-2 validation (2026-10-19, this MR; all live, both
  replicas):** boot logs clean after the post-merge roll (no
  startup-scripts abort, no Cannot attach, no type errors); shipped
  2-column text vs live `DESCRIBE` converged exactly on both replicas;
  ocsf matrix held (`ocsf.API_Activity` `severity_id` Int8 /
  `class_uid` Int32, live == shipped; `class_name`/`activity_id` on
  `ocsf.Base_Event` per its DDL). Ingest lane (fixture-shaped POSTs,
  diagnostic `case_uid` `ingest-lane-p2-20261019`): case-open → HTTP
  200/30 ms, writer `INSERT` in `system.query_log` at +1 s
  (batch_timeout), Incident Finding row (2005/200501) on BOTH replicas;
  minimal evidence → 200/171 ms, `INSERT` at +0.85 s, Datastore
  Activity row (6005/600504) on BOTH replicas; malformed POST (missing
  `kind`) → 200 + the map assert WARNING in node retro diagnostics
  (`map.tql:24:8`, run 111) — the loud reject the 10-18 capture missed.
  Pipeline metrics: POST windows ingress/egress 1/1, 1/1 (flush
  crossing one 10 s window), 1/0 for the malformed drop. Zero
  `to_clickhouse` type warnings during the valid smoke.

## Notes

- Repair-lap context and the full green matrix for everything else:
  [`ocsf-clickhouse-ddl-convergence-and-broken-parts.md`](./ocsf-clickhouse-ddl-convergence-and-broken-parts.md).
- Do not chase this by mutating tenzir node/pipeline config without a new
  operator-authorized lap (standing rule from this repair).
