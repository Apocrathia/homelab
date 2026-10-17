---
title: "ClickHouse rollout — tiered OCSF store, Grafana ClickHouse datasource, DuckDB lane retirement"
status: active
found_at: 2026-10-17
updated_at: 2026-10-17
area: observability
---

# ClickHouse rollout

## Goal

Turn the validated ClickHouse hot/cold prototype
(`.scratch/clickhouse-prototype/`, verdict: design holds) into shipped MRs:
ClickHouse 25.8 as the OCSF query store (hot Longhorn disk, cold S3 disk in
the dedicated rustfs `clickhouse` bucket, TTL + DELETE cap), Tenzir
writing live via
`to_clickhouse`, Grafana querying via the first-party ClickHouse plugin, and
the DuckDB/MotherDuck parquet lane retired after a history backfill. Five
logical MRs, each small enough to review whole.

## Evidence base

Read before implementing any slice. These carry the facts, not this plan:

- `.scratch/clickhouse-prototype/VERDICT.md` — full prototype evidence,
  gotchas, handoff checklist. Architecture A verified end-to-end.
- `.scratch/clickhouse-prototype/` — `config.d/storage.xml` (tiered policy,
  `from_env` creds), `sql/00_schema.sql` (DDL shape), `sql/40_queries.sql`
  (validated panel SQL), `grafana-datasource-clickhouse.yaml` (datasource
  sketch), `tenzir-pipeline-sketch.md`.
- `.scratch/duckdb-perf/repo-scout.md` — current archive layout, dashboard
  query shapes, duckdb machinery inventory (lines cite paths).
- `.scratch/duckdb-perf/engine-research.md` — engine matrix, why
  MergeTree-copy beats parquet-over-S3 (`s3()` ≈ 5x slower, no time
  partitioning — the reason the backfill is a one-time Tenzir replay, never a
  standing query surface).
- Vendored Tenzir skills (landed on origin/main at 54e9be3a3, AFTER the
  prototype lap — fetch before reading; a local checkout may be a beat
  behind):
  `flux/manifests/03-services/observability/tenzir/.agents/skills/tenzir/`
  (Tenzir product docs — TQL, operators, functions, integrations,
  deployment) and
  `.../tenzir/.agents/skills/tenzir-ocsf/` (OCSF schema reference, pruned
  to latest stable 1.9.0). Subtree router:
  `flux/manifests/03-services/observability/tenzir/AGENTS.md`. **Any lap
  that authors or changes Tenzir pipelines follows these skills** —
  operator arguments and pipeline conventions are cited to the vendored
  pages, not re-derived. Never edit the skill trees (generated upstream;
  protected `.agents/` path).
- Note for planning inputs: origin/main (c5acc891d, tenzir core OOM fix)
  reverted core's `ocsf_cast null_fill=true` too — both nodes now run bare
  `ocsf_cast` with `active-partition-timeout: 60s`. Read the node
  helmreleases on origin/main, not an older checkout.

Document-verified facts fetched during planning (2026-10-17). The same
Tenzir doc pages now live in-repo via the vendored `tenzir` skill above —
laps cite the vendored copies; these bullets record what was verified and
where:

- `fork` operator passes events through while copying to a subpipeline
  ("sent both to the given pipeline and forwarded at the same time to the
  next operator") —
  https://tenzir.com/docs/reference/operators/fork.md. This is the
  dual-write primitive; `to_s3`/`to_clickhouse` chaining assumptions are
  NOT needed and NOT used.
- Official ClickHouse image runs `/docker-entrypoint-initdb.d` scripts when
  the data dir is empty, and on every boot when
  `CLICKHOUSE_ALWAYS_RUN_INITDB_SCRIPTS` is set
  (ClickHouse/ClickHouse master `docker/server/entrypoint.sh`, fetched
  2026-10-17).
- `to_s3` strips `partition_by` fields from the written records; parquet
  files do NOT contain `class_uid`; Tenzir `read_parquet` has no hive
  partition support — backfill must re-derive `class_uid` per class prefix
  (to_s3 doc + read_parquet doc, fetched 2026-10-17).
- Tenzir managed secrets: env `TENZIR_SECRETS__CLICKHOUSE_PASSWORD` →
  `secret("CLICKHOUSE_PASSWORD")`
  (`.scratch/tenzir/raw/docs__explanations__secrets.md.md`).

## Operator-locked decisions (do not re-litigate)

1. **Architecture A** — hot local disk + cold S3-disk tier into the
   dedicated rustfs `clickhouse` bucket with its own bucket-scoped user
   and the dedicated 1Password item `clickhouse-secrets` (fields
   `aws-access-key-id` / `aws-secret-access-key`). Amended 2026-10-17 by
   the operator split directive, which REVERSED the original
   reuse-the-existing-bucket decision — the ClickHouse instance is not
   exclusively tenzir's and does not ride tenzir credentials.
2. **TTL with a DELETE cap** — move-to-cold at 90d; DELETE horizon is an
   operator value pick (strawman: 400d, decide at MR-1 review).
3. **Retire `to_s3` only AFTER the history backfill** — backfill runs via
   Tenzir `from_s3 → to_clickhouse` replay per class; never make
   CH-`s3()`-over-parquet a standing query surface.
4. **Grafana plugin via the standard `grafana.plugins:` chart value** —
   first-party signed `grafana-clickhouse-datasource`, pinned 4.20.x; NOT
   bundled in the deployed Grafana 13.2.3 (image-verified in the prototype
   verdict). Stock image, no init containers, no ini hacks, no creds in SQL.
5. **Dashboards migrate to ClickHouse SQL** — keep dashboard uids; JSON
   subcolumn access needs `toString()` casts in GROUP BY (validated
   translation table in VERDICT.md).
6. **No alert-rule migration** — verified no Grafana alert rule queries the
   `tenzir-ocsf` datasource.

## Shape decision (operator, 2026-10-17 - supersedes D1 below)

**Deploy via the Altinity Kubernetes Operator for ClickHouse - 1 shard x 3
replicas of `clickhouse-server` plus a 3-node ClickHouse Keeper ensemble -
NOT the generic-app single-pod shape D1 originally picked.** HA and
replication are now in scope: a pod or PVC loss re-syncs from the sibling
replicas instead of orphaning cold S3 parts. Everything else in this plan
carries over; D1/D2/D4/D5/MR-1 below are amended accordingly (they are kept
for the decision trail).

**Deployment mechanics (all verified against operator chart 0.27.4 from
`https://helm.altinity.com`, the CRDs shipped in that chart, and the
operator source):**

- Operator HelmRelease + `ClickHouseKeeperInstallation` (CHK) +
  `ClickHouseInstallation` (CHI) CRs in `clickhouse`; the operator
  watches that namespace only. CRDs install via the chart's pre-install
  hook.
- Keeper is deployed by the operator itself via the CHK CRD (the supported
  mechanism; the operator generates server_id/raft wiring and probes) and
  the CHI references it by name (`spec.configuration.zookeeper.keeper`);
  the operator resolves endpoints and waits for keeper readiness.
- Tables are `ReplicatedMergeTree` with operator-provided
  `{installation}/{cluster}/{shard}/{replica}` macros.
- Schema bootstrap uses ClickHouse `startup_scripts` (server config.d XML;
  the Altinity-documented mechanism) - per-replica idempotent
  `CREATE ... IF NOT EXISTS`, no `ON CLUSTER`.
- Users are defined in the CHI (`spec.configuration.users`) with
  `valueFrom.secretKeyRef` passwords and users.xml-level `<grants>` RBAC.

**Storage cost of the shape (operator-visible): replication means 3x the
single-node footprint on both tiers.** Hot: three Longhorn PVCs, one per
replica, each sized for the full ~90d window (3x 100Gi caps). Cold: every
replica runs the same S3 disk into the rustfs `clickhouse` bucket and uploads
its own copy of every cold part, so rustfs cold growth is ~3x the
single-node shape. Watch both when sizing.

**Local validation evidence (2026-10-17, clickhouse-server:25.8.33.6 +
clickhouse-keeper:25.8.33.6 in podman):** both CRs validate against the
exact CRD schemas from chart 0.27.4; the shipped startup-scripts XML
created all 9 tables through a live Keeper; `tenzir`/`grafana` users
authenticated and enforced their grants (INSERT denied for grafana);
dotted-column inserts landed in the right columns with the catch-all
absorbing the rest; TTL moved a 120-day-old part to the cold volume
automatically; the 400d DELETE cap dropped an expired row; server restart
was idempotent (no REPLICA_IS_ALREADY_EXIST). The test also caught one
real DDL bug before shipping: `CODEC` must FOLLOW `COMMENT` on a column -
the CODEC-then-COMMENT order shown in the Tenzir tutorial is a syntax
error on 25.8.

## Plan decisions

### D1 — Deployment shape (SUPERSEDED - see Shape decision above)

Kept for the decision trail. The original generic-app choice (one pod,
Recreate, no HA) was rejected on 2026-10-17 in favor of the Altinity
operator + 1 shard x 3 replicas + Keeper. The generic-app chart stays
untouched by this rollout (`helm/generic-app/**` remains a protected path
with an operator-confirmation gate for any discovered gap).

### D2 — Naming and placement

App dir `flux/manifests/03-services/observability/clickhouse/`, namespace
`clickhouse` (operator decision: no `-system` suffix unless required).
The CHI CR is named `ocsf` (so the operator's CR-level Service comes out as
`clickhouse-ocsf`) and the cluster inside it is `ocsf` - the `{cluster}`
macro value is `ocsf`. In-cluster DNS (operator-created Services):

- `clickhouse-ocsf.clickhouse.svc.cluster.local` - load-balanced over
  all replicas; HTTP 8123 (Grafana, probes) and native 9000 (Tenzir
  `to_clickhouse`). This replaces the old `clickhouse.observability.svc`
  and `clickhouse.clickhouse.svc` sketches.
- Per-host `chi-ocsf-ocsf-<shard>-<replica>` services for ad-hoc
  `clickhouse-client` against a specific replica.

### D3 — Table strategy: per-class tables with typed hot columns + JSON catch-all

Per Tenzir's integration guide (catch-all pattern), one table per OCSF class
in database `ocsf` (`ocsf.API_Activity`, `ocsf.Authentication`,
`ocsf.Account_Change`, `ocsf.Detection_Finding`,
`ocsf.Vulnerability_Finding`, `ocsf.Network_Activity`,
`ocsf.Process_Activity`, `ocsf.File_System_Activity`), each:

- typed columns for the fields the dashboards filter/aggregate on — dotted
  column names where useful (`` `src_endpoint.ip` ``, `` `actor.user.name` ``
  etc.; dots in a column name select the nested input path on insert, so
  the panel hot paths stay real typed columns);
- `unmapped JSON` (ocsf_cast marks it free-form → to_clickhouse maps the
  record into the JSON column);
- `event JSON COMMENT 'tenzir:catch_all'` — absorbs every field without a
  matching column;
- `PARTITION BY toDate(time)`, `ORDER BY (class_uid, time)` (mirrors the
  prototype), `TTL time + INTERVAL 90 DAY TO VOLUME 'cold'` plus
  `TTL time + INTERVAL <horizon> DAY DELETE`, `SETTINGS storage_policy =
'tiered'`;
- **Engine is `ReplicatedMergeTree`** (shape change): path
  `/clickhouse/{installation}/{cluster}/tables/{shard}/{database}/{table}`,
  replica macro `{replica}` — operator-provided macros, one replica node
  each, no `ON CLUSTER` DDL.

Plus `ocsf.Base_Event` (same shape, deliberately sparse typed columns):
the archive rule also ships class-0 Base Event fallbacks (fleet, authentik
non-IAM arm, tetragon unmatched policies), and `mode="append"` hard-fails
on a missing table — the fallback class needs a landing table or the first
base-event batch kills the pipeline leg. The prototype's `events` table
played exactly this role.

MR-1 DDL note (local-verified on 25.8): a JSON column with a catch-all
comment takes `COMMENT` BEFORE `CODEC` (`event JSON COMMENT
'tenzir:catch_all' CODEC(ZSTD(3))`); the CODEC-then-COMMENT order in the
Tenzir tutorial's "complete table" is a syntax error on 25.8.

Why not the prototype's rigid `Tuple` columns: the prototype DDL approximated
column shapes for synthetic rows. Real events are richer than any Tuple we
write down, and to_clickhouse append drops events whose record shape is
incompatible with a Tuple column ("incompatible values for typed columns
produce a warning and drop the affected event"). Both nodes now run bare
`ocsf_cast` (origin/main OOM fix reverted core's null_fill; tetragon was
reverted earlier) — nested schema churn is live on every archived class, so
rigid Tuple columns would drop real events. The catch-all absorbs the
churn; typed columns stay deliberately sparse (panel hot paths only).
Dashboard queries against cold nested paths read the catch-all / `unmapped`
JSON subcolumns — the `toString()`-cast GROUP BY gotcha from the verdict
applies. When writing the DDL (MR-1), verify each class's hot column picks
against the `tenzir-ocsf` skill (v1.9.0 class pages) — column names must
match the OCSF attribute paths to_clickhouse maps on insert.

Schema evolution: add typed columns server-side (`ALTER TABLE ... ADD
COLUMN`) when a new panel needs one; new insert rows route automatically
after to_clickhouse refreshes the table description (~30s). Initdb scripts
never ALTER existing tables.

### D4 — DDL bootstrap: ClickHouse startup_scripts (Altinity shape, amended)

The schema rides in the CHI as a `config.d/10-startup-scripts.xml` file
(server `startup_scripts` feature; Altinity's documented bootstrap
mechanism - docs/chi-examples/18-schema-init-02-startup-scripts.yaml). The
server executes the queries on every start, per replica, in order:
`CREATE DATABASE/TABLE IF NOT EXISTS` only, no `ON CLUSTER` (per Altinity
guidance, per-node DDL with the operator macros is the idempotent path; a
fresh-PVC replica re-CREATEs and re-attaches to its Keeper replica path,
recovering from siblings). The old generic-app `/docker-entrypoint-initdb.d`
mechanism is gone.

**Known trade-off:** `startup_scripts` errors do not block server boot
(`throw_on_error=false` keeps reads alive through Keeper outages). If
Keeper is not yet serving when a replica first boots, tables silently do
not exist until the next server restart - the operator-led apply
validation (SHOW TABLES after first boot) is a required step, and MR-3's
`mode="append"` fail-loud is the second net.

### D5 — ClickHouse users (CHI users config, from_env, no creds in git) — amended

Users live in the CHI (`spec.configuration.users`); the operator renders
them into users.d and injects passwords from the `clickhouse-secrets`
Secret as env vars (its `valueFrom.secretKeyRef`):

- `tenzir` — INSERT + SELECT on `ocsf.*` (live writer + backfill user;
  SELECT is required by to_clickhouse's table-description refresh and the
  live-leg validation). Password ← vault field `clickhouse-password`.
- `grafana` — SELECT-only on `ocsf.*` (datasource user). Password ← vault
  field `clickhouse-grafana-password`.

Both get networks `10.42.0.0/16` (cilium pod CIDR, verified in
`flux/manifests/02-infrastructure/cilium/helmrelease.yaml`
`clusterPoolIPv4PodCIDR`); the operator merges localhost networks plus a
host_regexp for the CHI's own service FQDNs into every user. Access is
users.xml-level `<grants>` RBAC: with grants present, a user's access is
exactly what is granted (both the grant enforcement and the
password-auth path were verified locally on 25.8). The `default` user
keeps the operator's default host_regexp restriction (no password, no
network exposure beyond the CHI's own services).

Env vars on the ClickHouse pods via the CHI podTemplate `secretKeyRef`
against the `clickhouse-secrets` Secret (OnePasswordItem `clickhouse-secrets`
→ the dedicated vault item `clickhouse-secrets`, per D6):
`CH_S3_ACCESS_KEY_ID` ← `aws-access-key-id`, `CH_S3_SECRET_ACCESS_KEY` ←
`aws-secret-access-key` (the dedicated rustfs `clickhouse` user's keypair;
same names the storage config's `from_env` reads).

`00-storage-tiered.xml` (in the CHI `configuration.files`) is the
prototype's storage config with the cold-disk endpoint at the dedicated
bucket root `http://storage.services.apocrathia.com:9009/clickhouse/`
— rest identical (type s3, from_env creds, 32 MiB single-part cap). The S3
cache-disk layer stays out of MR-1 (not prototype-validated; follow-up
option). Note the shape change: every replica runs this same disk config —
each replica uploads its own copy of every cold part (3x rustfs cold
growth; see the Shape decision).

### D6 — Secrets inventory (1Password Item CR pattern; values never in git)

**Split decision (2026-10-17 operator directive; supersedes the original
reuse plan): the ClickHouse instance is not exclusively tenzir's — it gets
a dedicated `clickhouse-secrets` vault item and a dedicated rustfs
`clickhouse` bucket with its own bucket-scoped user (provisioned via
`docs/infrastructure/rustfs-bucket-user-creation.md`, admin-API steps 1–5).
Nothing clickhouse consumes rides tenzir credentials; the original
one-item-carries-all-fields tradeoff is dead.**

| Vault item           | Field (kebab label)                                                              | Consumed by                                                                                                                          | Exists?                            |
| -------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| `clickhouse-secrets` | `aws-access-key-id`, `aws-secret-access-key`                                     | ClickHouse cold disk (env) — the dedicated rustfs `clickhouse` bucket user                                                           | new item — rustfs onboarding       |
| `clickhouse-secrets` | `clickhouse-password`                                                            | ClickHouse users.d (`valueFrom.secretKeyRef`) + Tenzir nodes `TENZIR_SECRETS__CLICKHOUSE_PASSWORD` (MR-3; one field, both consumers) | new item — **operator adds value** |
| `clickhouse-secrets` | `clickhouse-grafana-password`                                                    | ClickHouse users.d (`valueFrom.secretKeyRef`)                                                                                        | new item — **operator adds value** |
| `grafana-secrets`    | `clickhouse-grafana-user` + `clickhouse-grafana-key` (final shape depends on D7) | GrafanaDatasource `valuesFrom` → `secureJsonData`                                                                                    | **operator adds values**           |

Consolidation: use ONE vault field `clickhouse-password` on
`clickhouse-secrets` for the Tenzir writer password — ClickHouse's users.d
reads the same field (`valueFrom.secretKeyRef` key `clickhouse-password`);
drop the separate `clickhouse-tenzir-password` label. Grafana's user+key
ride on `grafana-secrets` because the datasource `valuesFrom` substitutes
from that Secret (same mechanism as the current tenzir-ocsf S3 creds). The
operator fills values; git only ever names fields. The
`clickhouse/cluster/secret.yaml` OnePasswordItem
(`itemPath: vaults/Secrets/items/clickhouse-secrets`) renders the
`clickhouse-secrets` Secret in `clickhouse`; the CHI users config and
podTemplate env read from it. MR-3 materializes the same item in the
tenzir namespace (one item, multiple OnePasswordItem CRs — the
1Password-operator pattern, now pointing at the dedicated item).

### D7 — Grafana datasource auth shape (verify in MR-2)

The prototype sketch uses `secureJsonData.httpHeaderPayload1/2` with
`X-ClickHouse-User`/`X-ClickHouse-Key` header strings via `valuesFrom`.
The ClickHouse plugin's provisioning key names differ across versions;
MR-2's implementer verifies the exact `jsonData`/`secureJsonData` schema
against the pinned plugin version's PROVISIONING doc (the
grafana/clickhouse-datasource repo for the pinned 4.20.x tag) before
finalizing the CR + vault field shape (D6 last row). Whichever shape the
plugin documents wins; creds arrive via `valuesFrom` from
`grafana-secrets`, never literal.

### D8 — Dual-write and backfill mechanics

- **Live dual-write** (transition window): the `ocsf-archive` compaction
  rule pipeline becomes
  `fork { to_clickhouse ... } to_s3 ...` — `fork` is the verified
  pass-through; the rule stays sink-only at the tail (`to_s3`), so
  archive-then-delete semantics are unchanged. `to_clickhouse`:
  `table=f"ocsf.{class_name.replace(\" \", \"_\")}"`,
  `host="clickhouse-ocsf.clickhouse.svc.cluster.local"` (the CR-level
  Service, load-balanced over the three replicas; ReplicatedMergeTree
  replicates an insert from whichever replica takes it), `port=9000`,
  `user="tenzir"`, `password=secret(\"CLICKHOUSE_PASSWORD\")`, `tls=false`,
  `mode="append"`, `max_batch_rows=65536` (per the integration guide's
  per-class pattern; `mode="append"` fails loudly if the DDL is missing —
  good).
- **Backfill (one-time, operator-led)**: per class, a bounded replay
  `from_s3 "s3://tenzir/ocsf/class_uid=<NNNN>/**.parquet?endpoint_override=storage.services.apocrathia.com:9009&scheme=http" { read_parquet }`
  → `where time < <cutover>` → `class_uid = <NNNN>` (re-derive the
  hive-stripped partition field) → same `to_clickhouse ... mode="append"`.
  The `where time < cutover` bound prevents double-insert of events the
  live leg already wrote (TTL is not a dedup; there is no dedup). TQL files
  land in git under the tenzir node folder (one per class); execution is
  operator-led via the tenzir CLI against the node, after MR-3 is live.
- **Live-leg validation before full trust**: MR-3's live phase spot-checks
  one real event of each of the two shape-risk classes (tetragon 1007 —
  schema churn; core 2004 — deep nested evidence records) inserted into
  `ocsf.*` without drop-warnings, before MR-4 dashboards cut over.

## Slices (one logical MR each)

### MR-1 — ClickHouse service (Altinity operator + Keeper + CHI)

**Branch:** `feat/clickhouse-service`

**Scope / files (new dir, all new files):**

- `flux/manifests/01-bootstrap/helm/repositories/altinity.yaml` —
  HelmRepository `https://helm.altinity.com` + registration in
  `repositories/kustomization.yaml` (**protected path touch** — flagged for
  operator review; nothing else in 01-bootstrap moves).
- `flux/manifests/03-services/observability/clickhouse/`:
  - `namespace.yaml` (`clickhouse`)
  - `operator.yaml` — `altinity-clickhouse-operator` 0.27.4 (CRDs via
    the chart's pre-install hook), `watchNamespaces: ["clickhouse"]`,
    operator resources, ServiceMonitor (ch-metrics + op-metrics) with the
    `release: kube-prometheus-stack` label; keeper metrics intentionally
    out (operator-generated keeper services publish only zk/raft by default)
  - `flux-kustomization.yaml` — Flux Kustomization `services-clickhouse`
    (operator layer: namespace + operator HelmRelease)
  - `cluster/` — the CR layer behind Flux Kustomization
    `services-clickhouse-cluster` (cluster/flux-kustomization.yaml),
    gated on `services-clickhouse` via `dependsOn` (see Apply order
    below):
    - `secret.yaml` — OnePasswordItem `clickhouse-secrets` on the dedicated
      new `clickhouse-secrets` vault item (fields per D6; operator fills
      values; never secret values in git)
    - `keeper.yaml` — ClickHouseKeeperInstallation `keeper`, 3 replicas,
      `clickhouse/clickhouse-keeper:25.8.33.6`, Longhorn PVCs (5Gi), required
      hostname anti-affinity (keeper quorum must not share nodes)
    - `cluster.yaml` — ClickHouseInstallation `ocsf`: 1 shard x 3 replicas
      (`clickhouse/clickhouse-server:25.8.33.6`, prototype-validated build),
      Longhorn data PVC per replica (100Gi cap), required hostname
      anti-affinity, /ping probes, podTemplate env for the rustfs creds,
      users (tenzir + grafana per D5/D6 with `<grants>`), keeper reference,
      `config.d/00-storage-tiered.xml` (tiered policy, from_env creds), and
      `config.d/10-startup-scripts.xml` (D3/D4 DDL — nine CREATE IF NOT
      EXISTS statements: eight per-class tables + Base_Event fallback; TTL
      move 90d + DELETE cap 400d, the 400 an operator-tunable value flagged
      in-file)
  - `kustomization.yaml` + `README.md` (folder README operator rule: shape,
    endpoints, TTL values + where the horizon lives, vault fields, the
    keeper-race caveat + apply-validation query, how to add a class, schema
    evolution = operator-led ALTER only)
- Registration (the CRD-ordering fix MR): clickhouse is
  NOT a resource of `observability/kustomization.yaml` (it left the
  `services-observability` kustomization — the dir is applied by its own
  two Flux Kustomizations instead); both
  `03-services/observability/clickhouse/flux-kustomization.yaml` and
  `03-services/observability/clickhouse/cluster/flux-kustomization.yaml`
  register in `flux/manifests/kustomization.yaml` (parent-then-child,
  the tetragon/policies + chaos-mesh/experiments pattern).
- `docs/plans/clickhouse-rollout.md` — this plan, amended in-place (this
  document; the shape decision section is the amendment record).

**Apply order (the CRD-ordering fix MR):** MR-1 shipped the operator HelmRelease and
the CHI/CHK CRs in one kustomization under `services-observability`; Flux
applied the CRs before the operator chart's pre-install CRD hook completed,
so the live `services-observability` reconcile failed with "no matches for
kind ClickHouseKeeperInstallation" and the whole observability dir sat
blocked behind it (clickhouse ns created, nothing inside). Fix (follow-up
commit on `feat/clickhouse-storage-split`, merges with the split): split
the dir into two Flux Kustomizations — `services-clickhouse` (namespace +
operator HelmRelease; the altinity HelmRepository applies from
`bootstrap-helm`, the ServiceMonitor CRD gates on
`infrastructure-kube-prometheus-stack`) and
`services-clickhouse-cluster` (`cluster/` path: OnePasswordItem + CHK +
CHI; `dependsOn: services-clickhouse`, `bootstrap-1password`,
`infrastructure-longhorn`). This is the house pattern for
operator-installed CRDs (`services-tetragon-policies`,
`services-chaos-mesh-experiments`, `services-renovate-operator-config`).
On merge, `services-observability` unblocks (clickhouse left its tree)
and the CRs wait for the operator instead of racing it. Not a separate MR:
the ordering fix alone would unblock the kustomization into a broken
state — CHI users materialize from `tenzir-secrets`, whose ClickHouse
password fields are already removed from the vault, and the split's
itemPath re-point to `clickhouse-secrets` is what makes the unblock safe.

**Acceptance:**

- `kustomize build` green on the observability tree plus both clickhouse
  layers (`clickhouse/`, `clickhouse/cluster/` — rendered objects include
  the operator Deployment, both CRs, namespace, OnePasswordItem); the CRs
  structurally validated against the CRD schemas
  shipped in chart 0.27.4 (jsonschema check — Warn-mode silently drops
  misspelled CHI/CHK fields, so the CR schema IS the field check).
- Apply-order proof (the CRD-ordering fix MR): `kustomize build flux/manifests`
  renders `services-clickhouse-cluster` with
  `dependsOn: services-clickhouse` (plus `bootstrap-1password`,
  `infrastructure-longhorn`), and the observability render drops exactly
  the 5 clickhouse objects (namespace, operator HelmRelease,
  OnePasswordItem, CHK, CHI — now applied by the two clickhouse
  Kustomizations instead).
- `helm template` against the real `altinity-clickhouse-operator` chart
  with the release's values proves the values drive the chart.
- The DDL + storage XML executed end-to-end locally on
  `clickhouse-server:25.8.33.6` + Keeper (tables, grants enforcement,
  dotted-column inserts + catch-all absorption, TTL move-to-cold, 400d
  delete cap, restart idempotency) — done 2026-10-17, evidence in the
  Shape decision section.
- `pre-commit run --all` (yamllint strict, kube-linter, gitleaks, prettier)
  green on the touched paths.
- No `helm/generic-app/**` changes anywhere in the diff; no edits under
  `tenzir/.agents/**` (vendored, protected).

**Operator-led (named, not in the MR):** vault + rustfs prep (provision
the rustfs `clickhouse` bucket + bucket-scoped user via the onboarding
runbook — admin-API steps 1–5 + verification battery; create the
`clickhouse-secrets` vault item with the new user's keypair; add the
`clickhouse-password` and `clickhouse-grafana-password` field values),
apply, watch keeper quorum (3/3 Ready), watch the CHI
status (Completed), run the README's `SHOW TABLES FROM ocsf` validation on
each replica, confirm `system.disks` shows `cold` on each replica, watch
rustfs capacity + the pvc-capacity alert for the three new PVCs. If tables
are missing (keeper race on first boot), restart the CHI pods once.

### MR-2 — Grafana plugin + ClickHouse datasource

**Branch:** `feat/grafana-clickhouse-datasource`

**Scope / files:**

- `flux/manifests/02-infrastructure/kube-prometheus-stack/helmrelease.yaml`:
  add pinned `grafana-clickhouse-datasource` to the `grafana.plugins` list
  (existing entries `grafana-llm-app`, `grafana-advisor-app` are unpinned;
  this one is pinned to 4.20.x per the operator lock — verify the exact
  pinning syntax the chart→GF_INSTALL_PLUGINS→grafana-cli path accepts for
  a versioned plugin, and write the comment so Renovate/manual bumps have
  one obvious place to land). Keep the `-ubuntu` image and all duckdb
  machinery untouched in this MR (still needed until MR-5).
- `flux/manifests/03-services/observability/grafana/datasources/ocsf-clickhouse.yaml`:
  GrafanaDatasource CR from the prototype sketch, corrected: URL
  `http://clickhouse-ocsf.clickhouse.svc.cluster.local:8123`, uid
  `ocsf-clickhouse`, instanceSelector same as tenzir-ocsf.yaml, auth shape
  per D7 verification (valuesFrom from `grafana-secrets`).
- Register in `observability/grafana/kustomization.yaml`; update
  `observability/grafana/README.md` (datasource list) and
  `grafana/datasources/` notes.

**Acceptance:** plugin entry + datasource CR render clean (kustomize,
pre-commit); datasource valuesFrom targets only existing
`grafana-secrets` field names (git names, never values); Warn-mode gate:
GrafanaDatasource spec fields verified against the grafana-operator CRD +
plugin PROVISIONING doc for the pinned version (the CRD is
server-applied — this is the surface where a mis-spelled key silently
no-ops).

**Operator-led:** apply, confirm the plugin landed (Grafana UI plugins
page or pod log), datasource "Save & Test" green. Vault prep: add the
clickhouse grafana user/key field values to `grafana-secrets`.

### MR-3 — Tenzir live `to_clickhouse` legs (fork dual-write)

**Branch:** `feat/tenzir-to-clickhouse`

**Skill gate (in force for the whole lap):** follow the vendored skills —
read `tenzir/AGENTS.md` (subtree router) +
`.agents/context/architecture.md` for the compaction-rule semantics, author
TQL against the `tenzir` skill (operator reference pages: `fork`,
`to_clickhouse`, `to_s3`, `secret`), and cite those pages in the lap notes.
No pipeline convention is re-derived from memory or scratch copies.

**Scope / files:**

- `flux/manifests/03-services/observability/tenzir/nodes/core/helmrelease.yaml`
  and `.../tetragon/helmrelease.yaml` (coupled surface — one implementer):
  - compaction rule `ocsf-archive` pipeline becomes
    `fork { to_clickhouse ... } to_s3 ...` (D8; to_s3 leg unchanged —
    it keeps flowing until MR-5);
  - `extraEnv` gains `TENZIR_SECRETS__CLICKHOUSE_PASSWORD` from the
    `clickhouse-secrets` item / `clickhouse-password`, materialized in the
    tenzir namespace by its own OnePasswordItem CR (AUTHENTIK_EVENTS_TOKEN
    precedent shape for the env wiring).
- a tenzir-namespace OnePasswordItem CR materializing `clickhouse-secrets`
  (field-list comment: `clickhouse-password`);
  `tenzir/README.md` (architecture section: CH as the OCSF query store,
  dual-write transition window), both node READMEs (pipeline change, batch
  sizing), `tenzir/grafana/README.md` untouched (dashboards still query
  duckdb until MR-4).

**Acceptance:** both helmrelease diffs render (helm template against the
tenzir-node chart is not possible locally without the chart — so
kustomize build + YAML schema check of values against the chart's values
schema, as prior tenzir laps did); every TQL operator argument in the fork
subpipeline (to_clickhouse: table f-string, mode="append",
max_batch_rows, host/port/user/password=secret()/tls) matches the vendored
`tenzir` skill's operator reference verbatim, with the page cited in the
lap notes; pre-commit green.

**Operator-led:** apply both nodes, watch the ocsf-archive rule pass
(exporter metrics / node diagnostics for to_clickhouse errors), then the
D8 live-leg validation (real 1007 + 2004 events land without
drop-warnings; `SELECT count()` grows per class). If append rejects real
event shapes (D3 risk), stop — the fallback is documented in D3 (typed
columns stay sparse; catch-all absorbs).

### MR-4 — Dashboards migrate to ClickHouse SQL

**Branch:** `feat/ocsf-dashboards-clickhouse`

**Scope / files:**

- `flux/manifests/03-services/observability/tenzir/grafana/ocsf-exploration.json`
  and `ocsf-findings.json`: every panel's datasource flips to uid
  `ocsf-clickhouse`; SQL translated per the validated table
  (`sql/40_queries.sql`): `time_bucket($__interval, time)` →
  `toStartOfInterval(time, INTERVAL ...)`, `count(*)` → `count()`,
  `class_uid::VARCHAR` → `toString(class_uid)`,
  `CROSS JOIN unnest(vulnerabilities)` → `ARRAY JOIN`, `||` → `concat()`,
  JSON-subcolumn GROUP BY wrapped in `toString()`. Dashboard uids
  (`tenzir-ocsf-exploration`, `tenzir-ocsf-findings`) unchanged; the
  GrafanaDashboard CRs unchanged (only JSON content changes).
- `tenzir/grafana/README.md` updated (datasource + query plane
  description).

**Acceptance:** JSON diffs limited to datasource uid + SQL expressions
(no panel-structure churn); each translated panel's SQL type-checks against
the MR-3 live data (operator shows screenshots or panel-query JSON during
review — the panels were prototype-validated as SQL, this lap only re-seats
them in the dashboard JSON); pre-commit green.

**Operator-led:** apply, eyeball both dashboards on the live window
(default 6h/24h panels), confirm no "illegal column" or datasource errors,
confirm refresh 5m holds. Do not delete the duckdb datasource yet — the
parquet lane is still the comparison oracle until MR-5.

### MR-5 — Transition + teardown: backfill manifests, to_s3 retirement, duckdb removal

**Branch:** `feat/clickhouse-cutover`

**Merge ONLY after the operator has run the backfill and validated parity
(see gate below). The MR text must name that gate explicitly.**

**Skill gate (in force for the whole lap):** same as MR-3 — TQL authored
against the vendored `tenzir` skill (operator pages: `from_s3`,
`read_parquet`, `where`, field assignment, `to_clickhouse`), and each class
uid → class_name → table mapping verified against the `tenzir-ocsf` skill
(v1.9.0 class pages: 6003 API Activity, 3002 Authentication, 3001 Account
Change, 2004 Detection Finding, 2002 Vulnerability Finding, 4001 Network
Activity, 1007 Process Activity, 1001 File System Activity).

**Scope / files:**

- Backfill manifests (added here, executed operator-led per D8):
  `tenzir/nodes/core/backfill/*.tql` (one per class; per-class prefix +
  `class_uid` re-derivation + `where time < cutover` bound + to_clickhouse
  append) + `tenzir/nodes/core/backfill/README.md` (operator runbook:
  cutover timestamp choice, per-class execution order, parity check
  commands, the duplicate-window reasoning).
- `to_s3` retirement: both node helmreleases — the `ocsf-archive` rule
  pipeline drops the `fork` wrapper and the `to_s3` sink, keeping only
  `to_clickhouse`; rule comments updated (CH is the archive now; the lake
  remains the 15-min transit buffer).
- Duckdb machinery teardown (all in
  `flux/manifests/02-infrastructure/kube-prometheus-stack/helmrelease.yaml`,
  per the verdict's inventory):
  - image override `13.2.3-ubuntu` → chart-default tag (drop the glibc
    override + its comment; ClickHouse plugin is pure JS);
  - `extraInitContainers: install-motherduck-plugin` + comment block →
    gone;
  - `extraContainerVolumes: plugin-install-tmp` → gone;
  - `grafana.ini plugins.allow_loading_unsigned_plugins:
motherduck-duckdb-datasource` → gone (ini auth/proxy blocks
    untouched);
  - `flux/manifests/03-services/observability/grafana/datasources/tenzir-ocsf.yaml`
    → deleted; kustomization + grafana README updated.
- `tenzir/README.md` final architecture (mermaid + planes text: single
  store in ClickHouse, rustfs parquet is read-only history), node READMEs,
  `tenzir/grafana/README.md` final state.

**Acceptance:** kustomize build green; pre-commit green; backfill TQL files
cite their skill reference pages in comments and match them verbatim; the
KPS diff shows ONLY removals from the duckdb inventory (no unrelated
grafana values churn); `tenzir-ocsf` no longer referenced anywhere except
historical docs (`grep -r tenzir-ocsf flux/` → only allowed mentions); no
`mc`/rustfs changes anywhere (see out of scope).

**Operator-led, in order (this order keeps dashboards working throughout):**

1. Backfill execution per the backfill README (after ≥ a few days of MR-3
   live data so continuity is proven, cutover timestamp recorded).
2. Parity check: per class, row counts in `ocsf.*` ≥ parquet row counts
   (count parquet rows via a one-off Tenzir query or rustfs object count
   sanity); spot-check oldest-window panel queries against the duckdb
   datasource one last time.
3. Merge + apply MR-5 (dashboards already run on CH since MR-4 — the
   duckdb lane's death changes nothing user-visible).
4. PVC cleanup: `kubectl exec` one-time removal of
   `/var/lib/grafana/plugins/motherduck-duckdb-datasource` (survives on
   the storage PVC after the init container is gone).

## Merge order + dependencies

```
MR-1 clickhouse service ──► MR-2 grafana plugin+datasource ─┐
        │                                                    ├─► MR-4 dashboards on CH ─► (operator backfill+parity) ─► MR-5 cutover/teardown
        └──► MR-3 tenzir to_clickhouse legs ─────────────────┘
```

1. **MR-1** first — everything points at the ClickHouse service.
2. **MR-3** after MR-1 is live (mode="append" needs bootstrapped tables +
   users; hard-fails otherwise, by design). MR-2 and MR-3 are independent
   of each other — both block only on MR-1.
3. **MR-2** after MR-1 (datasource reconciles against a running service;
   plugin must be installed before the datasource CR applies).
4. **MR-4** after both MR-2 and MR-3 are live (datasource exists + data
   flows). Wait for ≥ a day of live data so panels have content.
5. **MR-5** last — gated on the operator-run backfill + parity check
   (MR-3's live legs must have data continuity proven before the parquet
   writer dies).

Why the order is forced: the datasource CR with an unknown type or dead
URL lands broken (MR-2 needs 1); append-mode pipelines hard-fail on
missing tables (MR-3 needs 1); dashboards show empty panels without live
rows (MR-4 needs 2+3); retiring to_s3 before backfill execution would
permanently cap history at the cutover day (MR-5 needs the backfill done).

## Out of scope (explicit)

- No `helm/generic-app/**` edits (protected path; a discovered gap becomes
  an operator-confirmation gate, not an edit).
- No edits to `tenzir/.agents/**` — the vendored skills and subtree context
  are generated/hand-maintained local to that subtree (protected `.agents/`
  path); laps read and cite them, never modify.
- No rustfs changes inside the MR diffs: the dedicated `clickhouse`
  bucket + bucket-scoped user are provisioned via the onboarding runbook
  (`docs/infrastructure/rustfs-bucket-user-creation.md`, admin-API steps
  1–5) outside the MRs; no `mc admin`, no quota — existing consumers are
  untouched.
- No changes to the existing parquet archive layout
  (`s3://tenzir/ocsf/...`): no rewrite, no re-partition, no lifecycle
  policy, no deletion of existing objects. It becomes read-only history
  after MR-5.
- No parquet format changes anywhere (write side retires; format stays).
- No Grafana alert-rule migration (verified none query tenzir-ocsf).
- No ClickHouse **sharding** or a second cluster — the shape decision
  (2026-10-17) made replication IN scope (1 shard x 3 replicas + Keeper),
  but the dataset stays single-shard; revisit only if write volume forces
  horizontal partitioning.
- No ClickHouse S3 cache-disk layer (follow-up after rollout, per D5).
- No authentik/Gateway exposure of ClickHouse (cluster-internal only;
  ad-hoc access is `kubectl exec`/port-forward). Revisit if an MCP or gcx
  lane wants a ClickHouse client.
- No CH-`s3()`-over-parquet query surface, standing or otherwise.
- No dashboard uids/CR renames; no tenzir feed/map changes.

## Risks → named verification gates

| Risk                                                             | Gate                                                                                                                                                                                                      |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| to_clickhouse append drops real events (typed column mismatch)   | MR-3 live phase: D8 shape-risk spot-check (1007, 2004) before MR-4                                                                                                                                        |
| Plugin provisioning keys mis-spelled (silent CR no-op)           | MR-2: verify against pinned plugin PROVISIONING doc + operator Save & Test                                                                                                                                |
| Plugin pin syntax wrong for GF_INSTALL_PLUGINS                   | MR-2: verify chart→grafana-cli install path before merge                                                                                                                                                  |
| Grafana 13.2.3 + plugin 4.20.x incompatibility                   | MR-2 operator validation; fallback is a newer plugin patch in 4.20.x line                                                                                                                                 |
| Backfill double-insert (live leg + replay overlap)               | D8 `where time < cutover` bound; MR-5 merge gate includes parity check                                                                                                                                    |
| Tetragon flood RAM bump from the fork leg                        | MR-3 live watch (fork adds a sink to the archive rule; batch sizes bounded by max_batch_rows)                                                                                                             |
| Cold-tier orphaning on ALL-PVC loss                              | Replication (3 replicas) absorbs single pod/PVC loss via re-sync; losing all three PVCs orphans the S3 parts (no kopiur on these PVCs by design) — the README names it as the one real data-loss scenario |
| Keeper quorum loss (2 keepers down)                              | Required hostname anti-affinity on keepers; reads keep working, replicated writes stall until quorum returns                                                                                              |
| First-boot keeper race: startup_scripts run before Keeper serves | README validation query after apply + MR-3 append fail-loud; restart CHI pods once if tables are missing                                                                                                  |
| 3x storage growth (3 Longhorn PVCs + 3x rustfs cold parts)       | Shape decision section; watch rustfs capacity + pvc-capacity alert first week                                                                                                                             |
| ClickHouse resource sizing unknown (fresh workload class)        | MR-1 per-replica requests/limits strawman (500m/2Gi requests, 2/6Gi limits), operator watches first week + pvc-capacity alert                                                                             |

## Feedback loop (local, no cluster mutation)

```bash
kustomize build flux/manifests/03-services/observability > /dev/null
helm repo add altinity https://helm.altinity.com
helm template ch-operator altinity/altinity-clickhouse-operator \
  --version 0.27.4 -n clickhouse -f <rendered-mr1-values>
pre-commit run --all            # yamllint --strict, kube-linter flux/, gitleaks, prettier
# CR field check (Warn-mode strips misspelled CHI/CHK fields): validate
# cluster/cluster.yaml + cluster/keeper.yaml against the CRD schemas shipped in chart 0.27.4
grep -rn "clickhouse" flux/manifests | sort    # reference sanity for the CR/datasource names
```

MR-3/MR-4 add: JSON panel diff review against `sql/40_queries.sql`; MR-5
adds the `grep -r tenzir-ocsf flux/` reference sweep. All live applies,
backfill execution, and PVC cleanup are operator-led and named per slice;
this plan never authorizes cluster mutation.
