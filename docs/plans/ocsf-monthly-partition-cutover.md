---
title: "ocsf class tables: monthly partitions + 90-day Network_Activity — live cutover runbook"
kind: feature
status: open
severity: medium
source: agent
found_at: 2026-10-29
area: observability
slice: hitl
---

# ocsf class tables: monthly partitions + 90-day Network_Activity — live cutover runbook

The shipped `10-startup-scripts.xml` now creates every ocsf class table
with monthly partitions (`PARTITION BY toYYYYMM(time)`) and gives
`ocsf.Network_Activity` a 90-day `DELETE` horizon (operator decision
2026-10-29; every other class table keeps 400 days). The live tables
still carry the old shape — daily partitions, 400 days everywhere — and
ClickHouse partition keys have no `ALTER`: convergence is a per-table
rebuild (new table + copy + rename), not a live statement. Init scripts
never touch existing tables
([`ocsf-clickhouse-ddl-convergence-and-broken-parts.md`](./ocsf-clickhouse-ddl-convergence-and-broken-parts.md)),
so this doc is the operator-led live-cutover half of the D3/D4 pairing.

The XML change ships first: fresh-PVC boots already create the new
shape. Nothing in this doc runs without the operator's explicit go —
cluster mutation is never agent-initiated here.

## GATE — resolve the core-node incident before the cutover

**Do not start any table while `tenzir-node-core` is in CrashLoopBackOff
(186 restarts).** The crashloop floods `ocsf.Detection_Finding` with
"Detection record chain break" findings — 45.63M of its ~45.6M rows are
that flood. Until the node is stable:

- the biggest table keeps growing mid-rebuild — the copy and the verify
  lanes read a moving target;
- the flood dominates the table the cutover would bake in.

The flood rows accumulated before the resolution are the operator's
call — prune them (shrinks the Detection_Finding copy from ~9 GiB to
real findings) or accept them into the copy. Decide before step (b) on
`Detection_Finding`; the incident itself is a separate open item and is
not resolved by this runbook.

## Store sizing (read 2026-10-29, `chi-tenzir-ocsf-0-0-0`, read-only)

| Table                                                   | Rows  | Size     |
| ------------------------------------------------------- | ----- | -------- |
| `ocsf.Detection_Finding`                                | 45.6M | 8.95 GiB |
| `ocsf.Process_Activity`                                 | 31.7M | 5.25 GiB |
| `ocsf.API_Activity`                                     | 16.5M | 2.59 GiB |
| `ocsf.Network_Activity`                                 | 4.1M  | 880 MiB  |
| `ocsf.OSINT_Inventory_Info`                             | 397k  | 65 MiB   |
| `ocsf.Vulnerability_Finding`                            | 13.5k | 68 MiB   |
| `ocsf.File_System_Activity`                             | 65k   | 6.8 MiB  |
| `ocsf.Base_Event` / `Authentication` / `Account_Change` | small | small    |

Context: the store holds only ~1.4 days of data (min `time`
2026-10-27 17:37 everywhere — the 2026-10-27 retention change wiped
prior history); hot 17.75 GiB, cold 35 MiB; `investigations.records`
exists but is empty (and needs no cutover — it is already monthly). Three
replicas: `chi-tenzir-ocsf-0-{0,1,2}-0`. With ~1.4 days in the store,
each table's month-slice is a single 2026-10 slice and the copies are
trivially small — the procedure below is the general case, and today's
execution is its trivial instance.

## Per-table procedure

One table at a time, smallest first, `Detection_Finding` last (after the
flood disposition). DDL (`CREATE`, `RENAME`) is per-replica metadata —
run it on all three replicas, the same per-replica pattern as the
bootstrap (each replica's `{replica}` macro mints its own Keeper entry).
Data (`INSERT`) runs on one replica; the shared Keeper path replicates
the parts to the other two.

### (a) Create `<C>_v2` from the live DDL, not from the XML

The live DDL converged separately from the XML — lift it from the store:

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

1. Suspend the writing node(s) for the table — their `ocsf-archive`
   rules (`core` / `tetragon` / `netflow` per the node READMEs;
   `Detection_Finding` is written by the verify walks) — or suspend the
   node HelmReleases outright for the window.
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

## RENAME and replication notes

- `RENAME` of ReplicatedMergeTree tables is metadata-only: data does not
  move, and each table keeps its original Keeper path. The renamed-in
  `ocsf.<C>` (ex-`_v2`) therefore serves under its `_v2` Keeper path —
  harmless; writers and readers address tables by name.
- Replicated `RENAME` does not propagate through the replication queue:
  the statement must run on every replica, like the bootstrap (the loop
  above).
- After the old table is dropped, a replica that loses its PVC
  re-CREATEs `ocsf.<C>` from the shipped XML at the original `{table}`
  Keeper path and re-syncs from its siblings — post-cutover, the shipped
  XML is again the whole truth for fresh boots, in the new shape.

## Acceptance

- [ ] GATE cleared: `tenzir-node-core` stable, no CrashLoopBackOff; the
      Detection_Finding flood stopped and its rows pruned or accepted by
      the operator before that table's copy.
- [ ] `SHOW CREATE TABLE` on every ocsf class table (all three replicas)
      says `PARTITION BY toYYYYMM(time)`.
- [ ] `ocsf.Network_Activity` live TTL is `INTERVAL 90 DAY DELETE`;
      every other class table `400 DAY DELETE`.
- [ ] Row counts match old vs new per month before each `_daily` drop.
- [ ] `system.parts` shows a handful of monthly partitions per table, no
      daily-partition residue, parts active on all three replicas.
- [ ] One Grafana panel over the `ocsf-clickhouse` datasource renders
      the cutover tables.
- [ ] The attestation verify walks stay silent post-cutover (no
      chain-break findings attributable to the copy/rename).
- [ ] No `_v2` / `_daily` tables remain in `SHOW TABLES FROM ocsf`;
      writers resumed, nodes green.

## Feedback loop

- `xmllint --noout flux/manifests/04-apps/security/tenzir/clickhouse/config/10-startup-scripts.xml`
- `kustomize build flux/manifests/04-apps/security/tenzir/clickhouse > /dev/null`
- The per-replica `kubectl exec` reads above (`SHOW CREATE`, row counts,
  `system.parts`) — read-only; every mutation in this doc needs the
  operator's explicit go.

## Notes

- ``ocsf.`null` `` (the stray catch-all) gets the same partition change
  in the XML but is empty live — include it in the cutover for
  consistency or leave it to the next fresh boot; its disposition is
  already flagged in the DDL-convergence issue above.
