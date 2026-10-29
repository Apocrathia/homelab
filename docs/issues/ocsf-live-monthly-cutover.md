---
title: "Live ocsf tables still daily-partitioned + Network_Activity at 400d until the cutover runs"
kind: feature
status: open
severity: medium
source: agent
found_at: 2026-10-29
area: observability
slice: hitl
plan: docs/plans/ocsf-monthly-partition-cutover.md
---

# Live ocsf tables still daily-partitioned + Network_Activity at 400d until the cutover runs

## Problem / desired state

The shipped bootstrap DDL creates every ocsf class table with monthly
`toYYYYMM(time)` partitions and a 90-day `DELETE` horizon on
`ocsf.Network_Activity` (operator decision 2026-10-29), but init scripts
never touch existing tables — every live class table still carries
daily partitions and the uniform 400-day horizon. ClickHouse partition
keys have no `ALTER`, so live convergence is a per-table rebuild
(create + copy + rename) that must be run deliberately.

## Acceptance

- [ ] `SHOW CREATE TABLE` on every ocsf class table (all three
      replicas) says `PARTITION BY toYYYYMM(time)`.
- [ ] `ocsf.Network_Activity` live TTL is `INTERVAL 90 DAY DELETE`;
      every other class table `400 DAY DELETE`.
- [ ] Row counts match old vs new per month before each `_daily` drop.
- [ ] `system.parts` shows a handful of monthly partitions per table,
      no daily-partition residue, parts active on all three replicas.
- [ ] One Grafana panel over the `ocsf-clickhouse` datasource renders
      the cutover tables.
- [ ] The attestation verify walks stay silent post-cutover.
- [ ] No `_v2` / `_daily` tables remain in `SHOW TABLES FROM ocsf`;
      writers resumed, nodes green.

## Feedback loop

- The per-replica `kubectl exec` reads in the plan's Verify section
  (`SHOW CREATE`, row counts, `system.parts`) — read-only; every
  mutation needs the operator's explicit go.
- `xmllint --noout flux/manifests/04-apps/security/tenzir/clickhouse/config/10-startup-scripts.xml`

## Implementation hint

Run
[`docs/plans/ocsf-monthly-partition-cutover.md`](../plans/ocsf-monthly-partition-cutover.md).
Its GATE: the `tenzir-node-core` crashloop must be resolved first (the
restart churn re-floods `ocsf.Detection_Finding`). The flood rows
themselves were pruned 2026-10-29 (operator-directed `ALTER ...
DELETE`, 45,631,490 rows, table back to ~11.3k real findings / 1.8
MiB).

## Notes

Store holds only ~1.4 days of history (the 2026-10-27 retention change
wiped prior history), so today's execution is the plan's trivial
instance: one month slice per table. `investigations.records` and
`ocsf.fleet_assets` are already monthly and out of scope. The stray
``ocsf.`null` `` table's disposition is tracked in
[`ocsf-clickhouse-ddl-convergence-and-broken-parts.md`](./ocsf-clickhouse-ddl-convergence-and-broken-parts.md).
