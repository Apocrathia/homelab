---
title: "ocsf cutover residue: flood-residue prune (operator-gated) + per-replica spot-check"
kind: feature
status: open
severity: medium
source: agent
found_at: 2026-10-29
area: observability
slice: hitl
plan: docs/plans/ocsf-monthly-partition-cutover.md
---

# ocsf cutover residue: flood-residue prune (operator-gated) + per-replica spot-check

## Problem / desired state

The monthly-partition cutover ran and the live store now matches the
canonical DDL — engine, TTL horizons, and column parity verified
2026-11-05 (Met, below). What remains is cutover residue:

- `ocsf.Detection_Finding` holds ~3.50M chain-break flood rows
  (`metadata.product.name = 'homelab-detection'`, "Detection record
  chain break") re-emitted by the investigations-attest-verify walk
  while tenzir-node-core crash churn kept breaking the record chain.
  Pruning them is a mutating `ALTER ... DELETE` — operator-gated.
- Core-node stability gate: the churn that re-floods the walk must
  stay resolved, or the prune re-fills the table.
- Per-replica `SHOW CREATE TABLE` spot-check: the 2026-11-05
  verification ran through the `ocsf-clickhouse` datasource, which
  grants neither per-replica DDL nor `system.parts`.
- ``ocsf.`null` `` stray (0 rows) — disposition still pending, now
  tracked here (the DDL-convergence issue shipped and was deleted on
  ship).

## Acceptance

Met on the live store (verified 2026-11-05, read-only queries through
the `ocsf-clickhouse` datasource):

- [x] Every live class table: `ReplicatedMergeTree`,
      `PARTITION BY toYYYYMM(time)`, `ttl_only_drop_parts = 1`
      (`system.tables` engine_full).
- [x] Live TTL: `time + toIntervalDay(7) TO VOLUME 'cold'` plus
      `DELETE` at 400d; `ocsf.Network_Activity` alone at 90d
      (`system.tables` engine_full).
- [x] Every table `config/10-startup-scripts.xml` creates — the 10
      named class tables, `ocsf.fleet_assets`, ``ocsf.`null` ``, and
      `investigations.records` — matches live column-for-column
      (`system.columns` diff).
- [x] `SHOW TABLES FROM ocsf`: no `_v2` / `_daily` residue. Per the
      runbook the renamed-out old tables drop only after the
      old-vs-new row-count verify passes, so the cutover reached its
      final step.
- [x] Writers resumed, nodes green: 3 replicas Running
      (`chi-tenzir-ocsf-0-0-0` / `0-1-0` / `0-2-0`, 3d16h, no
      restarts), 3 Keeper pods green, store ~15.6 GiB and ingesting —
      data begins 2026-11-01/02 (retention wipe).
- [x] One Grafana panel over the `ocsf-clickhouse` datasource renders
      the cutover tables: `ocsf-findings.json` reads
      `ocsf.Detection_Finding`, and the 2026-11-05 verification itself
      ran through that same datasource.

Still open:

- [ ] Flood-residue prune: 3,503,910 of 3,507,888 `Detection_Finding`
      rows are chain-break residue (`homelab-detection`), 3,978 real
      findings (`trivy`) — count split by `metadata.product.name`,
      2026-11-05. Mutating `ALTER ... DELETE`; needs the operator's
      explicit go.
- [ ] Core-node stability gate: tenzir-node-core churn stays
      resolved; post-prune the attestation verify walks staying
      silent is the pass signal.
- [ ] Per-replica `SHOW CREATE TABLE` spot-check on all three replicas
      plus the `system.parts` monthly-part count read — read-only
      `kubectl exec`; the datasource user is granted neither.
- [ ] ``ocsf.`null` `` disposition decided (currently 0 rows).

## Feedback loop

- Read-only store reads via the `ocsf-clickhouse` datasource:
  `SHOW TABLES FROM ocsf`, `system.tables` engine_full,
  `system.columns` — the path the 2026-11-05 verification used.
- Per-replica `kubectl exec` reads in the plan's Verify section
  (`SHOW CREATE`, `system.parts`) — read-only; the prune mutation
  needs the operator's explicit go.
- `xmllint --noout flux/manifests/04-apps/security/tenzir/clickhouse/config/10-startup-scripts.xml`

## Implementation hint

The cutover runbook is
[`docs/plans/ocsf-monthly-partition-cutover.md`](../plans/ocsf-monthly-partition-cutover.md);
its GATE — core-node stability — is the live gate for the prune. The
prune repeats the 2026-10-29 operator-directed `ALTER ... DELETE`
precedent (45,631,490 rows then, ~3.5M now).

## Notes

Store holds a single month slice per table (data begins 2026-11-01/02,
retention wipe). `investigations.records` and `ocsf.fleet_assets`
were already monthly and out of scope.
