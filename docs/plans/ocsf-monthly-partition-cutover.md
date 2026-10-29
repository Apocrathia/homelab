---
title: "OCSF store monthly-partition cutover — live convergence runbook"
status: blocked # blocked on the tenzir-node-core crashloop fix (the GATE below)
found_at: 2026-10-29
updated_at: 2026-10-29
related_issue: docs/issues/ocsf-live-monthly-cutover.md
area: observability
---

# OCSF store monthly-partition cutover — live convergence runbook

## Goal

The shipped `10-startup-scripts.xml` creates every ocsf class table
with monthly partitions (`PARTITION BY toYYYYMM(time)`) and gives
`ocsf.Network_Activity` a 90-day `DELETE` horizon (operator decision
2026-10-29; every other class table keeps 400 days). The live tables
still carry the old shape — daily partitions, 400 days everywhere — and
ClickHouse partition keys have no `ALTER`: convergence is a per-table
rebuild (new table + copy + rename), not a live statement. Init
scripts never touch existing tables
([`../issues/ocsf-clickhouse-ddl-convergence-and-broken-parts.md`](../issues/ocsf-clickhouse-ddl-convergence-and-broken-parts.md)),
so this plan is the operator-led live-cutover half of the D3/D4
pairing. The XML change ships first: fresh-PVC boots already create the
new shape. Nothing in this plan runs without the operator's explicit
go — cluster mutation is never agent-initiated here.

## Scope

**In scope:** the 11 live ocsf class tables (`Base_Event`,
`API_Activity`, `Authentication`, `Account_Change`,
`Detection_Finding`, `Vulnerability_Finding`, `Network_Activity`,
`Process_Activity`, `File_System_Activity`, `OSINT_Inventory_Info`,
and the stray ``ocsf.`null` ``).

**Out of scope:** `investigations.records` and `ocsf.fleet_assets`
(already monthly); the XML DDL itself (shipped with the partition MR);
the tenzir-node-core crashloop incident (separate open item — this
plan is merely gated on it).

## Decisions

- Monthly `toYYYYMM(time)` partitions + 90-day Network_Activity horizon
  — operator decision 2026-10-29.
- DDL (`CREATE`, `RENAME`) is per-replica metadata: run on all three
  replicas (the `{replica}` macro mints each Keeper entry). Data
  (`INSERT`) runs on one replica; the shared Keeper path replicates the
  parts to the other two. One-replica-only CREATE would split-brain the
  cutover.
- `ocsf.<C>_daily` (the renamed old table) stays until verify passes —
  rollback is the two renames reversed, per replica.
- The "Detection record chain break" flood rows in
  `ocsf.Detection_Finding` were pruned 2026-10-29 by the operator's
  explicit instruction: 45,631,490 rows deleted via
  `ALTER ... DELETE` (mutations_sync = 2, verified on replicas 0 and 1);
  the table is back to its ~11k real findings at ~1.8 MiB. Only the
  core-node stability gate remains.

## Steps

- [ ] **GATE — resolve the core-node incident before the cutover.** Do
      not start any table while `tenzir-node-core` is in
      CrashLoopBackOff: the restart churn re-floods
      `ocsf.Detection_Finding` (the crashloop produced 45.63M
      chain-break findings before the prune) and the verify lanes read
      a moving target. The flood-row prune itself is done; the incident
      is its own open item.
- [ ] Store sizing read (2026-10-29, `chi-tenzir-ocsf-0-0-0`, after the
      flood prune): `Detection_Finding` ~11.3k rows / 1.8 MiB,
      `Process_Activity` 31.7M / 5.25 GiB, `API_Activity` 16.5M /
      2.59 GiB, `Network_Activity` 4.1M / 880 MiB,
      `OSINT_Inventory_Info` 397k / 65 MiB, `Vulnerability_Finding`
      13.5k / 68 MiB, `File_System_Activity` 65k / 6.8 MiB;
      `Base_Event` / `Authentication` / `Account_Change` small. The
      store holds only ~1.4 days of data (min `time` 2026-10-27 17:37
      — the 2026-10-27 retention change wiped prior history); hot
      17.75 GiB, cold 35 MiB. Re-read before executing.
- [ ] Per-table procedure, one table at a time, smallest first,
      `Detection_Finding` last.

### (a) Create `<C>_v2` from the live DDL, not from the XML

The live DDL converged separately from the XML — lift it from the
store:

```bash
kubectl exec -n tenzir chi-tenzir-ocsf-0-0-0 -- \
  clickhouse-client --query "DESCRIBE TABLE ocsf.<C>"
kubectl exec -n tenzir chi-tenzir-ocsf-0-0-0 -- \
  clickhouse-client --query "SHOW CREATE TABLE ocsf.<C>"
```

Edit the lifted `SHOW CREATE` into `ocsf.<C>_v2`:

- table name → `ocsf.<C>_v2` (keep the Keeper path in macro form —
  `'/clickhouse/{installation}/{cluster}/tables/{shard}/{database}/{table}'`
  — so the `_v2` name mints its own Keeper path automatically);
- `PARTITION BY toYYYYMM(time)`;
- the table's own `TTL` — 400-day `DELETE` unchanged, except
  `Network_Activity` → `INTERVAL 90 DAY DELETE`;
- everything else — columns, codecs, `ORDER BY`, settings —
  byte-identical to live.

Then create it on every replica:

```bash
for r in 0 1 2; do
  kubectl exec -i -n tenzir chi-tenzir-ocsf-0-${r}-0 -- \
    clickhouse-client --multiquery < ocsf-<C>_v2.sql
done
```

### (b) Month-sliced copy (one replica; parts replicate)

```sql
INSERT INTO ocsf.<C>_v2
SELECT * FROM ocsf.<C>
WHERE `time` >= '<month start>' AND `time` < '<month end>'
```

One `INSERT` per month slice. With ~1.4 days of history that is a
single slice (`'2026-10-01'` → `'2026-11-01'`) per table; record the
last boundary used — the delta copy in (c) continues from it.

### (c) Cutover window — the only step that needs the writers quiet

1. Suspend the writing node(s) for the table — the stateless CH-direct
   legs (core / tetragon / netflow per the node READMEs;
   `Detection_Finding` is also written by the verify walks) — or
   suspend the node HelmReleases outright for the window.
2. Final delta copy on one replica:
   `INSERT INTO ocsf.<C>_v2 SELECT * FROM ocsf.<C> WHERE time >= '<last boundary copied>'`.
3. Rename, per replica, back to back:

```bash
for r in 0 1 2; do
  kubectl exec -n tenzir chi-tenzir-ocsf-0-${r}-0 -- \
    clickhouse-client --query "RENAME TABLE ocsf.<C> TO ocsf.<C>_daily"
  kubectl exec -n tenzir chi-tenzir-ocsf-0-${r}-0 -- \
    clickhouse-client --query "RENAME TABLE ocsf.<C>_v2 TO ocsf.<C>"
done
```

4. Resume the writers.

### (d) Verify

- Row counts, old vs new, per month:

```sql
SELECT 'old' src, toYYYYMM(`time`) m, count() FROM ocsf.<C>_daily GROUP BY m
UNION ALL
SELECT 'new' src, toYYYYMM(`time`) m, count() FROM ocsf.<C> GROUP BY m
ORDER BY m, src
```

- `SHOW TABLES FROM ocsf` — the cutover table is present; no stray
  `_v2`.
- Monthly part counts:

```sql
SELECT partition, count() AS parts
FROM system.parts
WHERE database = 'ocsf' AND active AND table = '<C>'
GROUP BY partition ORDER BY partition
```

- One Grafana panel over the `ocsf-clickhouse` datasource reading the
  table — proves the query lane against the new shape.
- Confirm the attestation verify walks stay silent on the renamed
  table: chain rows copy verbatim and the fingerprints cover rows as
  stored, so verification is copy-invariant; the walks address the table
  by name, so post-rename they read the new table and a clean copy
  produces no new chain-break findings (a persistent break re-emits
  hourly — silence is the pass signal).

### (e) Rollback, then drop

Keep `ocsf.<C>_daily` until the verify passes — rollback is the two
renames reversed, per replica. On pass, `DROP TABLE ocsf.<C>_daily` on
every replica: that frees the pre-change data (and, for
`Network_Activity`, is also where >90-day history would be disposed of
— today only ~1.4 days exist, so there is none).

## Feedback loop

- `xmllint --noout flux/manifests/04-apps/security/tenzir/clickhouse/config/10-startup-scripts.xml`
- `kustomize build flux/manifests/04-apps/security/tenzir/clickhouse > /dev/null`
- The per-replica `kubectl exec` reads above (`SHOW CREATE`, row counts,
  `system.parts`) — read-only; every mutation in this plan needs the
  operator's explicit go.

## Notes

- `RENAME` of ReplicatedMergeTree tables is metadata-only: data does
  not move, and each table keeps its original Keeper path. The renamed-in
  `ocsf.<C>` (ex-`_v2`) therefore serves under its `_v2` Keeper path —
  harmless; writers and readers address tables by name.
- Replicated `RENAME` does not propagate through the replication queue:
  the statement must run on every replica, like the bootstrap.
- After the old table is dropped, a replica that loses its PVC
  re-CREATEs `ocsf.<C>` from the shipped XML at the original `{table}`
  Keeper path and re-syncs from its siblings — post-cutover, the shipped
  XML is again the whole truth for fresh boots, in the new shape.
- ``ocsf.`null` `` (the stray catch-all) gets the same partition change
  in the XML but is empty live — include it in the cutover for
  consistency or leave it to the next fresh boot; its disposition is
  already flagged in the DDL-convergence issue.
