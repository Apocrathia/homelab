---
title: "ocsf ClickHouse: startup-DDL parse abort + broken parts on both replicas"
kind: bug
status: open
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

- [ ] Convergence `ALTER`s executed live (severity_id → Int8; class_uid →
      Int32 where divergent; missing typed columns added) — OR the shipped
      DDL text reverted to match live structure if the fresh-install intent
      is dropped.
- [ ] Startup-scripts file parses at boot; `investigations.records` and the
      null-class catch-all self-create on the next boot.
- [ ] The D3/D4 pairing gate is recorded as a rule: any startup-DDL edit MR
      ships with its live `ALTER`s in the same lap plus the post-apply
      validation query — a mandatory check on CHI changes.
- [ ] Both replicas attach `ocsf.API_Activity` clean (no
      `TOO_MANY_UNEXPECTED_DATA_PARTS` at boot).
- [ ] `SHOW TABLES FROM ocsf` returns; `ocsf` queries work cluster-wide.
- [ ] Broken-parts disposition recorded (117-part deletion accepted vs
      forensic recovery attempted).
- [ ] `to_clickhouse` inserts to `ocsf` tables resume on the core node.

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
