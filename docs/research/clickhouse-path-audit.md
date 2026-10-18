---
title: "Tenzir to ClickHouse path audit (vendor-doc vs homelab)"
kind: assessment
status: complete
found_at: 2026-10-18
area: observability
---

# Tenzir → ClickHouse path audit

> Research note (October 2026). Read-only vendor-doc vs homelab audit of the
> Tenzir → ClickHouse write path, produced during the ocsf DDL-divergence +
> broken-parts repair (see
> `docs/issues/ocsf-clickhouse-ddl-convergence-and-broken-parts.md` for the
> outcome). Follow-ups are proposals until they land as issues/plans or in
> the tree. Original scout copy lives at
> `.scratch/agent-investigation/clickhouse-path-audit.md`.

Scout report, read-only. Date: 2026-10-18. Bar: every claim labeled
**[vendor-doc]** (cited vendored Tenzir file + line), **[homelab]** (cited repo
path/commit), or **[inference]** (my reasoning). Vendored docs root (VDR):
`flux/manifests/03-services/observability/tenzir/.agents/skills/tenzir/` —
all vendor citations are relative to VDR unless absolute.

---

## 1. The vendor's blessed path, end to end

The vendored docs define **three** write patterns, split by who owns the
table DDL. The integration guide makes the split explicit ("Choose an
integration path" table, VDR `integrations/clickhouse.md`):

| Pattern                        | Who creates the table                            | Mode                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One table per OCSF class       | **Tenzir** (auto-create)                         | default `create_append` + `primary=time, json=unmapped` (VDR `integrations/clickhouse.md` "Create a table per OCSF class", l.84ff; VDR `reference/operators/to_clickhouse.md` l.86-90) |
| Append to a table you manage   | **You**, once, in a SQL shell                    | `mode="append"` — "makes the pipeline fail if the table does not exist, so ClickHouse remains the source of truth for the schema" (VDR `integrations/clickhouse.md` l.147)             |
| Managed table + JSON catch-all | **You**, once; catch-all absorbs unmapped fields | `mode="append"` (VDR `integrations/clickhouse.md` "Catch-all columns")                                                                                                                 |

**The tutorial's shape** (VDR `tutorials/build-an-ocsf-lake-with-clickhouse.md`):
a single-node Docker ClickHouse (l.30-40), a **single wide table**
`ocsf.events` — typed columns + `unmapped JSON` + `raw_data String` +
`event JSON COMMENT 'tenzir:catch_all'` — `PARTITION BY (class_uid,
toYYYYMM(time))`, `ORDER BY (class_uid, time)` (l.168-200, l.300-315). All
DDL is run **by a human in a SQL shell** (`docker exec -it clickhouse
clickhouse-client`, l.44-46); `mode="append"` is chosen deliberately so
"ClickHouse stays in charge of the schema" (l.183). The catch-all-first →
typed → indexes → TTL staging is a **tuning progression on one live table**,
not a boot sequence. Per-class tables are shown as an alternative ("One table
per class", l.727) with named trade-offs, and the tutorial rejects them for
its own shape: "A single table with class-aware partitions gives you most of
the pruning of per-class tables with one schema to maintain, which is why
this tutorial uses it." (l.753).

**Schema evolution is live `ALTER`, never DDL re-render.** "Evolve the table"
(l.790-830): promote a catch-all path with `ALTER TABLE ... ADD COLUMN
... DEFAULT event.path.:Type`; "Within 30 seconds, every pipeline that
writes to the table notices the column and writes new values into it instead
of the catch-all, without a restart." (l.809). Backfill old rows with
`MATERIALIZE COLUMN`; undo with `DROP COLUMN` (l.831-840). The integration
guide repeats the mechanism ("Change which paths get typed columns", worker
refresh every 30 s, VDR `integrations/clickhouse.md` l.226) and adds insert
retry on schema-mismatch reload (l.321).

**Who owns DDL, vendor answer:** either Tenzir (auto-create path — tables
born from the first event, `primary` + `json` options) or you (managed path —
create once by hand; every later change is a live `ALTER` the running writer
picks up in ≤30 s). In **both** vendor paths the schema is a property of the
live table, and schema change is an event on the live table. **[vendor-doc]**

**Type guidance that motivated our fixes:** "Use signed integers, because
Tenzir rejects OCSF integers in unsigned columns. Use `Int8` for enum
IDs" (tutorial l.309-310). The append path supports narrower types
`UInt16, UInt32, Int8, Int16, Int32, Float32`; `UInt8` is _not_ in that
list — in catch-all tables it "accepts unsigned integers from 0 to 255",
and in non-catch-all tables it is the legacy boolean mapping (VDR
`reference/operators/to_clickhouse.md` l.182; VDR
`integrations/clickhouse.md` catch-all example — which also shows the
pipeline must send `uint()` for unsigned columns). So the direction of the
severity fix (Int8) matches vendor guidance; the mechanism did not.
**[vendor-doc]**

**The nano pattern** (VDR `integrations/nano.md`): Tenzir writes
`mode="append"` into a pre-existing ingest entry table
(`nanosiem.ocsf_logs_raw`); a materialized view derives the queryable
table — "you only ever write the entry point, never ... directly". So
ingest-table + MV is a vendor-recognized shape in a SIEM product context,
not the general recommendation.

**What the vendor docs do NOT cover at all** (verified by grep across the
vendored tree: guides, tutorials, integrations, reference): server
deployment/HA (no replication, no Keeper, no operators — the tutorial is
single-node `MergeTree`), users.d / credentials lifecycle, startup scripts
or any boot-time DDL mechanism, GitOps/DDL-as-code. The vendor treats
ClickHouse as a prerequisite service — "managed separately from Tenzir"
(VDR `integrations/clickhouse.md` "Set up ClickHouse": ClickHouse Cloud or
a self-managed server). One vendor-doc bug worth noting: the tutorial's
"complete table" puts `CODEC` before `COMMENT`, a syntax error on 25.8 —
already caught and documented locally. **[vendor-doc + homelab]**

## 2. to_clickhouse table self-management

Exact mode list (VDR `reference/operators/to_clickhouse.md` l.84-90):
**[vendor-doc]**

- `mode="create"` — create table + database; fails if the table exists.
- `mode="append"` — append; fails if table or database do not exist.
- `mode="create_append"` — create table + database if missing, append if
  present. **This is the default.**

Auto-create details: schema inferred from the first events; scalar
non-primary columns become `Nullable`; `primary=` required for creation;
`json=` forces listed fields (e.g. `unmapped`) to `JSON` columns even when
absent from the first event; `low_cardinality=` dictionary-encodes string
columns (VDR `reference/operators/to_clickhouse.md` l.92-125, "Table
Creation"). In create modes the URI also creates the database (l.56-58).

Evolution: **there is no auto-evolution of existing tables** — new fields on
an existing table go to the catch-all (if any) or are dropped with a
warning (VDR `integrations/clickhouse.md` catch-all section; tutorial
l.170-172). Evolution of a managed table is the human-`ALTER` flow above.
**[vendor-doc]**

So: **yes, to_clickhouse self-manages tables by default**
(`create_append`); we opted out of that with an explicit `mode="append"`
per the managed-table path.

## 3. Failure-by-failure mapping

Homelab context, all **[homelab]**: Altinity operator shape with 1 shard ×
2 replicas + 3 Keeper, `ReplicatedMergeTree`, all DDL in one
`config.d/10-startup-scripts.xml` with `throw_on_error=false`
(`flux/manifests/03-services/observability/clickhouse/cluster/cluster.yaml`
l.142-168 schema-bootstrap comment, l.168); per-class `ocsf.*` tables +
`investigations.records` CREATEs in that one file (l.170-385); write mode
`append` everywhere (`nodes/investigations/pipelines/investigations-ingest-http.tql`
l.7-14; core/tetragon archive rules per
`docs/plans/clickhouse-rollout.md` D8).

- **(a) One mismatched CREATE aborts the entire startup-scripts file;
  tables silently stop existing; writers fail "table does not exist".**
  **Homelab construction the vendor path avoids entirely.** The vendor
  paths have no boot-time DDL at all: tables are either Tenzir-created at
  first write or human-created once; nothing re-runs DDL at every boot, so
  no boot DDL file exists whose partial failure can orphan tables. The
  rollout plan itself flagged a silent-failure cousin (Keeper race: "tables
  silently do not exist until the next server restart",
  `docs/plans/clickhouse-rollout.md` D4, l.255-260) and relied on two
  gates: the operator-led `SHOW TABLES` validation after apply, and
  append-mode failing loudly. The one-bad-statement-kills-the-whole-file
  abort mode was **not** named in the plan and is not covered by any
  vendored doc. **[homelab + parent's live finding]**
- **(b) severity fix edited startup DDL with no live ALTER.** Two layers.
  (1) **Against the vendor path:** vendor evolution is live `ALTER` picked
  up in ≤30 s (tutorial l.809; integration guide l.226) — never editing
  bootstrap text, which is a no-op on existing tables (`IF NOT EXISTS`)
  and a divergence bomb on fresh replicas. (2) **Against our own written
  rule:** the rollout plan already pinned this discipline — "add typed
  columns server-side (`ALTER TABLE ... ADD COLUMN`) ... Initdb scripts
  never ALTER existing tables" (D3, l.238-241; README wording "schema
  evolution = operator-led ALTER only", l.419). Git evidence: commit
  `45cd29202` ("fix(clickhouse): Int8 severity*id + null-class catch-all
  table", 2026-10-17) changed 9× `severity_id UInt8 → Int8` in the CREATE
  text and added `ocsf.``null```; **zero ALTER statements** in the diff.
It is the second such edit: `cbb02987f` ("retype class_uid to Int32")
  followed the same pattern — the mechanism is systemic, not a one-off.
  **[homelab]** The fix's \_direction* was vendor-correct (Int8 for enum
  IDs, tutorial l.309-310); only the mechanism diverged.
- **(c) `mode="append"` requires the table to pre-exist.** Vendor-documented
  behavior (to*clickhouse l.87) and a deliberate homelab choice (D8: append
  "fails loudly if the DDL is missing — good", l.357). The ingest pipeline
  error was a \_consequence* of (a): the table that should have pre-existed
  didn't, because the bootstrap file aborted. On the vendor's managed path
  the same append would also fail — but there the table's existence is
  deterministic (created once by hand / by Tenzir), not contingent on a
  boot script's health. The HTTP-200-while-failing shape is
  `accept_http`'s documented default (investigations README: "the POST
  itself still 200s ... the agent's write confirmation is the query-lane
  read-back"). **[vendor-doc + homelab]**
- **(d) users.d changes need a pod roll (auth lag).** Homelab/Altinity
  construction, **outside vendor scope entirely** — no vendored doc
  mentions users.d, user lifecycle, or credential rotation; the vendor
  assumes a ready server with existing users (integration guide "Set up
  ClickHouse"). Nothing bypassed; nothing vendor-lit to return to.
  **[homelab; vendor-silent]**
- **(e) Writer needs SELECT because to_clickhouse runs DESCRIBE.**
  Vendor-implied (the 30-s "table descriptions" refresh, integration guide
  l.226) and **already anticipated and handled**: rollout plan D5
  ("SELECT is required by to_clickhouse's table-description refresh"),
  cluster.yaml user comments, investigations README ("SELECT for the
  to_clickhouse DESCRIBE refresh"). Not a deviation; a known cost paid
  correctly. **[vendor-doc-implied + homelab]**

## 4. Verdict

**The operator is right about the mechanism, with one scope caveat.** A
well-lit vendor path exists, it is explicit about DDL ownership and
evolution (live `ALTER`, ≤30 s pickup, catch-all absorbs new fields), and
failures (a) and (b) — the ones that actually took the path down — are
constructions the vendor path structurally avoids: boot-time DDL-as-code
whose text can diverge from live state and whose partial failure is silent.
The migration habit that caused both (fix-by-editing-CREATE-text, no ALTER)
violates the vendor model **and the homelab's own written plan rule**
(rollout D3 l.238-241). **[inference from vendor-doc + homelab evidence]**

The caveat: the vendor path is single-node, users-less, GitOps-less. Our
Altinity/HA/ReplicatedMergeTree/users.d choices are _not_ deviations from a
lit path — the vendor has no lit path for them at all ("managed separately
from Tenzir"). What the vendor path _would_ have given us is the
discipline: schema lives in the live table, change is `ALTER`, bootstrap
text is born-idempotent and never touched again. That part we departed
from, and that departure is where every breakage lives. Per-class tables
are also vendor-documented (integration guide; tutorial "One table per
class"), though the tutorial prefers a single class-partitioned table —
per-class hand-DDL is forced on us by ReplicatedMergeTree + TTL + tiered
storage, which auto-create cannot produce. **[inference]**

Roughness that is inherent (not our deviation): to_clickhouse's
drop-with-warning on typed-column mismatches, the DESCRIBE/SELECT
requirement, and the vendor's silence on ops/deployment. Roughness that is
ours: boot-time DDL bootstrap with all-or-nothing abort +
`throw_on_error=false`, and text-edit "migrations" that never touch live
tables. **[inference]**

## 5. Recommendations (minimal sets)

**(i) `investigations.records`** — stay on the vendor's managed-table path
(create once, `mode="append"`, evolve by `ALTER`); the table needs its hand
DDL (ORDER BY correlation_uid, class partitions, no-TTL design), so
auto-create (`create_append`) would forfeit the schema — keep append:

1. **Converge live state to shipped DDL once** — the live-table `ALTER`s
   (severity_id and any other divergent columns) matching commit
   `45cd29202`'s DDL text, executed server-side as the plan's
   "operator-led ALTER" step. [homelab action]
2. **Enforce the plan's own pairing rule as a hard gate**: any
   `cluster.yaml` startup-DDL edit ships with the matching live `ALTER`s in
   the same lap, plus the post-apply validation query (`SHOW TABLES`,
   `DESCRIBE` the changed columns) — the gate the plan already names
   (rollout D4 l.258-260, README l.419) but the severity-fix lap skipped.
3. **Blast-radius option, needs verification first**: split the one
   `10-startup-scripts.xml` into per-concern files (ocsf vs investigations)
   if Altinity's startup_scripts runs multiple files independently — an
   ocsf DDL failure then can no longer take down `investigations.records`.
   Verify the multi-file behavior before relying on it. [inference +
   homelab mechanics to verify]

**(ii) the `ocsf.*` tables** — same converge-and-discipline set, plus one
shape decision to keep consciously:

1. **Converge**: live `ALTER`s to the shipped DDL types (severity_id Int8,
   class_uid Int32 — both vendor-recommended types, tutorial l.309-310)
   so shipped CREATEs are again no-ops on existing tables and
   correct-on-fresh-PVC. One lap, all nine tables. [homelab action]
2. **Discipline**: "shipped CREATE text is frozen for existing tables;
   live changes are `ALTER`-only" — already the plan's rule; make the
   post-apply `SHOW TABLES FROM ocsf` check a mandatory gate on every CHI
   change. [homelab process]
3. **Schema evolution goes forward as vendor does it**: promote hot
   columns via `ALTER ... ADD COLUMN ... DEFAULT event.path.:Type`
   (tutorial "Evolve the table"), writers pick up in ≤30 s without
   restarts; `MATERIALIZE COLUMN` for old rows. [vendor-doc]
4. **Optional, larger**: a future migration to the tutorial's single
   class-partitioned `ocsf.events` table would remove 8 hand-DDL schemas
   and most of the bootstrap file's mass (tutorial l.753), at the cost of
   repointing dashboards and re-planning TTLs. Not required to be on the
   vendor path — per-class is documented too. [vendor-doc + inference]

**What NOT to change**: `mode="append"` (correct for managed tables,
fail-loud is a feature); the tenzir/investigations-writer INSERT+SELECT
grants (vendor-implied, verified); the Altinity/HA shape itself (no vendor
alternative exists; the failures came from the migration mechanism, not the
topology). [inference]

---

### Sources

Vendored (VDR = `flux/manifests/03-services/observability/tenzir/.agents/skills/tenzir/`):
`reference/operators/to_clickhouse.md` (read in full), `reference/operators/from_clickhouse.md`
(full), `tutorials/build-an-ocsf-lake-with-clickhouse.md` (full),
`reference/optimizations/clickhouse.md` (full), `integrations/clickhouse.md`
(full), `integrations/nano.md` (full); grep sweep of VDR `guides/` for
clickhouse/startup-scripts/users.d/operator coverage.

Homelab: `docs/plans/clickhouse-rollout.md` (full), `flux/manifests/03-services/
observability/clickhouse/cluster/cluster.yaml` (full), `flux/manifests/03-services/
observability/tenzir/.agents/context/architecture.md` (full), `tenzir/nodes/investigations/`
(helmrelease, README, ingest TQL), git log of cluster.yaml (`45cd29202`,
`cbb02987f`, `b659c98f5`, `9f5e1fbe5`).

Failure facts (a)-(e) as stated by the parent (live-verified in-cluster);
this scout did no cluster calls.
