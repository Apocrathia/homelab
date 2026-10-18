---
title: "ocsf ClickHouse: startup-DDL parse abort + broken parts on both replicas"
kind: bug
status: closed
severity: blocker
source: agent
found_at: 2026-10-18
area: observability
slice: hitl
---

# ocsf ClickHouse: startup-DDL parse abort + broken parts on both replicas

Two live incidents (both verified 2026-10-18 on the chi-tenzir-ocsf cluster)
have taken the OCSF query store down cluster-wide. Incident A is a
DDL/live-state divergence that aborts the shared startup-scripts file at every
boot; incident B is 117 broken parts on `ocsf.API_Activity` that block the
table from attaching on both replicas. Together they mean every query touching
the `ocsf` database fails and `investigations.records` does not exist.

## Problem / desired state

### Incident A — startup-scripts parse abort

The severity-Int8 fix (commit `45cd29202`, "fix(clickhouse): Int8 severity_id

- null-class catch-all table") edited nine `ocsf` CREATE statements in the
  CHI's shared `10-startup-scripts.xml` without any live `ALTER`s. At every
  server boot ClickHouse validates replicated CREATEs against ZooKeeper, hits
  the structure mismatch — local DDL: `class_name`, `activity_id
Nullable(UInt8)`, `severity_id Int8`; ZK/live: `severity_id UInt8`, no
  `class_name`/`activity_id` — and **aborts the entire file**. Nothing in it
  executes, including the `investigations.records` CREATE.

This violated the rollout plan's own rule
(`docs/plans/clickhouse-rollout.md` D3: initdb scripts never ALTER existing
tables — schema evolution is operator-led live `ALTER`). The
fix-by-text-edit is the anti-pattern that rule exists for.

Desired state: startup DDL and live table structures agree, so the
startup-scripts file parses at boot; `investigations.records` and the
null-class catch-all self-create on the next boot; and the D3/D4 pairing gate
(DDL edit + live `ALTER`s in the same lap) is recorded as a mandatory check on
CHI changes.

### Incident B — broken parts on both replicas (detection-plane data risk)

`ocsf.API_Activity` cannot attach on `chi-tenzir-ocsf-0-0-0` and
`chi-tenzir-ocsf-0-1-0` — identical error: "Suspiciously many (117 parts,
0.00 B in total) broken parts to remove while maximum allowed is 100"
(`TOO_MANY_UNEXPECTED_DATA_PARTS`, cannot attach from metadata). Any query
touching the `ocsf` database fails via the async-load wait (`SHOW TABLES FROM
ocsf` included), and `to_clickhouse` inserts to `ocsf` tables must be failing
on the core node. Zero-byte part files on both replicas suggest storage-level
damage; the disk-pressure/Longhorn reservation era is a suspect (the Longhorn
storage-reservation fix `a9206db79` landed the same day).

Desired state: both replicas attach `ocsf.API_Activity` clean, `ocsf` queries
work cluster-wide, and the broken-parts disposition (accept deletion vs
forensic recovery) is an explicit operator decision.

## Repro

- Incident A: restart either replica → the server log shows the
  startup-scripts file abort on the first mismatched CREATE;
  `investigations.records` missing afterwards.
- Incident B: `SHOW TABLES FROM ocsf` (or any `ocsf` query) → fails via the
  async-load wait; per-replica server log shows the 117-broken-parts error.

## Acceptance

- [x] Convergence `ALTER`s executed live (severity_id → Int8; class_uid →
      Int32 where divergent; missing typed columns added) — done 2026-10-18
      across two parallel lanes: severity_id → Int8 on 8 tables by the
      operator's lane (02:36Z) and on `API_Activity` by the repair lap
      (02:53Z); class_uid was already Int32 live; no columns were missing.
      The follow-on id/status pairing (`status_id`, `activity_id` → Int8)
      landed as !5363 with its own live `ALTER`s.
- [x] Startup-scripts file parses at boot; `investigations.records` and the
      null-class catch-all self-create on the next boot — verified at the
      02:27Z/02:28Z boots (both objects created) and re-verified after the
      final roll: the file executes end-to-end on both replicas.
- [x] The D3/D4 pairing gate is recorded as a rule — see the D3/D4 note in
      `docs/plans/clickhouse-rollout.md`; both repair-era DDL MRs (!5359,
      !5363) shipped their live `ALTER`s in the same lap.
- [x] Both replicas attach `ocsf.API_Activity` clean — no
      `TOO_MANY_UNEXPECTED_DATA_PARTS` at boot after the temporary
      allowance (!5362, reverted as !5370); fresh boot logs clean on both
      replicas.
- [x] `SHOW TABLES FROM ocsf` returns; `ocsf` queries work cluster-wide —
      all 10 tables on both replicas; `SELECT count() FROM
ocsf.API_Activity` works on both (1.5M+ rows, replication in sync).
- [x] Broken-parts disposition recorded — 117 parts, 0.00 B in total:
      deletion accepted (operator, 2026-10-18 ~02:07Z authorization) and
      executed at the 02:47Z attach; no forensic recovery attempted
      (zero-byte parts, surviving replica copy intact).
- [x] `to_clickhouse` inserts to `ocsf` tables resume on the core node —
      verified live: 1,059 `INSERT INTO ocsf.*` statements in 5 minutes at
      final verification, row counts growing on both replicas.

## Outcome (2026-10-18 repair lap)

Both incidents repaired; the ocsf query store is fully restored. Repair
history, for the record:

- **The `LowCardinality(Int8)` fix** (!5359, branch
  `fix/chi-investigations-ddl-int8`): the reordered startup scripts made
  `investigations.records`' CREATE the first live execution — and it failed
  Code 455 (`SUSPICIOUS_TYPE_FOR_LOW_CARDINALITY`) on the shipped text. Fixed
  by dropping LowCardinality from the int columns; live pairing = the CREATE
  itself (out-of-band CHI apply ~02:25Z, operator-rolled 02:27Z/02:28Z,
  MR merged 02:24Z).
- **The id/status pairing** (!5363, branch `fix/chi-ocsf-id-status-int8`,
  merged 04:08Z): `status_id` (Authentication, Detection_Finding) and
  `activity_id` (Base_Event, null, Process_Activity) aligned to
  `Nullable(Int8)` in the shipped text **and** live via `ALTER`s in the same
  lap — the D3/D4 gate practiced.
- **Repair A executed in parallel lanes**: 8 tables' `severity_id → Int8`
  `ALTER`s ran out-of-band from the operator's lane at 02:36Z;
  `API_Activity`'s ran from this lap at 02:53Z (it was still
  broken-parts-blocked until the allowance MR !5362 applied).
- **Repair B**: 117 broken parts (0.00 B) dropped at attach under the
  temporary `max_suspicious_broken_parts=200` allowance (!5362), reverted as
  !5370 once both replicas attached clean. Disposition: deletion accepted +
  executed; no forensic recovery (zero-byte parts; sibling copy intact).
- **Incident C** (new during the lap): replica 0-0-0's `ocsf` metadata and
  table store dirs were found absent mid-repair; presumed self-inflicted
  during the 10-17/10-18 DDL fix attempts (operator assessment), not
  forensically investigated. The replica was rebuilt from the startup script
  - replication; data parity verified (row counts match).
- **Mechanism refinement** (corrects the Incident A description above): the
  Code 122 "Table columns structure in ZooKeeper is different from local
  table structure" abort fires only on a **fresh `CREATE` against a divergent
  ZK structure**; replicas holding local metadata silently skip divergent
  `IF NOT EXISTS` text. The "every boot validates and aborts" phrasing was
  directionally right but overstated the failure domain.
- **Final convergence matrix**: all 11 tables (investigations.records + 10
  ocsf), every column, zero divergences vs origin/main on BOTH replicas —
  verified via `system.columns` diff at 04:2xZ and re-verified after the
  final roll.

## Feedback loop

Post-apply validation queries (rollout D4):

- `SHOW TABLES FROM ocsf` — full table list, no async-load timeout.
- `SHOW TABLES FROM investigations` — `investigations.records` present after
  a replica boot.
- `DESCRIBE` the changed columns on the nine tables (e.g. `DESCRIBE
ocsf.API_Activity`) — `severity_id Int8`, `class_uid Int32`,
  `class_name`/`activity_id` present.
- Boot check: no "Cannot attach" / broken-parts errors in either replica's
  server log after restart.
- Insert smoke: POST to the investigations ingest lane, confirm via the
  query-lane read-back (the POST itself 200s even while failing —
  `accept_http` documented behavior; the read-back is the confirmation).
  **BLOCKED 2026-10-18**: two benign case-open POSTs 200'd but never landed
  in `investigations.records` on either replica; the ingest lane silently
  drops accepted events — the table side is proven clean, the defect is in
  the lane itself. Filed as
  [`investigations-ingest-lane-silent-drop.md`](./investigations-ingest-lane-silent-drop.md).

## Implementation hint

Update 2026-10-18 (verified against ClickHouse 25.8 source): the split-file
isolation option from the audit is DEAD - startup_scripts reads the fully
merged config view and aborts at the first failing query across ALL files
(Server.cpp loadStartupScripts, one try/catch around the whole loop), and a
second config.d file would deterministically overwrite same-identifier
<scripts> blocks (ConfigProcessor mergeRecursive). The interim unblock is
script ORDERING: investigations DDL runs first in the single file
(fix/chi-startup-script-ordering, in review). The convergence ALTERs (or
DDL revert) remain the root fix.

Full vendor-doc vs homelab audit (live-verified 2026-10-18):
`/Users/ianyoung/Projects/homelab/.scratch/agent-investigation/clickhouse-path-audit.md`.
`.scratch` is gitignored — promote it to `docs/research/` if it needs to
outlive this lap.

- Repair A (operator-led, cluster mutation — NOT GitOps-pushable): execute
  the live `ALTER`s that converge the nine `ocsf` tables to the shipped DDL,
  OR revert the shipped DDL text to match live structure if the
  fresh-install intent is dropped. Either way the file parses again and
  `investigations.records` + the null-class catch-all self-create at the next
  boot.
- Repair B (operator-led, data-loss tradeoffs): raise
  `max_suspicious_broken_parts` (accepts deleting the 117 broken parts) vs
  forensic recovery of the part files. Both replicas share the same logical
  parts via replication — intact copies may not exist.

## Notes

- Discovered during the investigations-platform smoke; the severity-fix lap
  (commit `45cd29202`) skipped the plan's own D3/D4 gate. This is the second
  text-edit-only DDL change (`cbb02987f`, "retype class_uid to Int32", was
  the first) — the mechanism is systemic, so the fix is the gate, not the
  one-off.
- Repair is cluster mutation: filing this issue authorizes nothing. Live
  `ALTER`s and settings changes need explicit operator go-ahead.
