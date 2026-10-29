# ClickHouse datalake — the OCSF lake and investigations store

The custom resources behind the `ocsf` query store and the investigations
`records` table: the ClickHouseInstallation (CHI) `tenzir`, its Keeper
ensemble, and the extracted server config (the CHI and its Keeper run in
the `tenzir` namespace — relocated from `clickhouse` 2026-10-27; the
credential renders they consume live one level up in
[`../secret.yaml`](../secret.yaml)). The
cluster is nested under the tenzir tree because its dedication is
structural — it exists to be this stack's datalake, and nothing else
writes here. The Altinity operator itself stays at the services root
([`03-services/clickhouse`](../../../../03-services/clickhouse/README.md));
this layer is its own Flux Kustomization (`services-clickhouse-cluster`)
gated on it.

> **Navigation**: [← Tenzir](../README.md) |
> [Investigations node](../nodes/investigations/README.md) |
> [Operator layer](../../../../03-services/clickhouse/README.md)

## Objects

- `keeper.yaml` — ClickHouseKeeperInstallation `tenzir`: the 3-node
  Keeper ensemble
- `cluster.yaml` — thin CHI: users, keeper ref, cluster layout, pod
  template; `files:` holds placeholder keys stitched at build time
- `config/00-storage-tiered.xml` — tiered-storage policy: hot Longhorn
  PVC + cold S3 disk (the stitched source of truth)
- `config/10-startup-scripts.xml` — schema bootstrap: investigations
  DDL first, then the ocsf tables (the stitched source of truth)
- `flux-kustomization.yaml` — Flux Kustomization
  `services-clickhouse-cluster` (this layer's gate)
- `kustomization.yaml` — kustomize assembly: configMapGenerator +
  replacements stitch for the two config files

The stitch is the authentik.tf / chaos-mesh build-time shape:
`kustomization.yaml` packages `config/` into a ConfigMap
(`tenzir-clickhouse-config`, `disableNameSuffixHash`), and replacements
rules byte-copy each key into the CHI's `spec.configuration.files`
entries. `config/` is the single source of truth — never edit the
placeholder keys in `cluster.yaml`, never render this directory outside
kustomize.

## Apply order

The operator chart installs the
`clickhouse.altinity.com` / `clickhouse-keeper.altinity.com` CRDs through
its pre-install hook job - CRs applied before that hook completes fail
with "no matches for kind". `services-clickhouse-cluster` applies only
after its gates clear:

- `services-clickhouse` - the Altinity operator itself (installs both CRDs).
- `apps-security` - the tenzir namespace plus the `tenzir-secrets`
  OnePasswordItem render in
  [`../secret.yaml`](../secret.yaml) that the CHI consumes (one render per
  item since the store relocated into the tenzir namespace; this layer's
  own `secret.yaml` is gone).
- `infrastructure-longhorn` - both CRs provision Longhorn PVCs.

This is the house pattern (services-tetragon-policies /
services-chaos-mesh-experiments / services-renovate-operator-config).

## The datalake shape: one JSON column

`investigations.records` is the single-JSON-column contract:

```sql
CREATE TABLE IF NOT EXISTS investigations.records
(
    `time` DateTime64(9, 'UTC') CODEC(Delta, ZSTD),
    `event` JSON COMMENT 'tenzir:catch_all' CODEC(ZSTD(3))
)
ENGINE = ReplicatedMergeTree('/clickhouse/{installation}/{cluster}/tables/{shard}/investigations/records', '{replica}')
PARTITION BY toYYYYMM(time)
ORDER BY (time)
SETTINGS storage_policy = 'tiered', ttl_only_drop_parts = 1
```

One typed column — `time`, the partition/sort spine — and one
[`tenzir:catch_all`](https://tenzir.com/integrations/clickhouse#catch-all-columns)
JSON column that absorbs the entire OCSF record. Nothing else is typed.
The vendor's own decision rule governs when to promote a typed column:

> "Choose typed columns for fields you filter, sort, or aggregate. Keep
> the rest in the catch-all until you need a dedicated column."
> — [Tenzir ClickHouse integration](https://tenzir.com/integrations/clickhouse),
> [to_clickhouse reference](https://tenzir.com/docs/reference/operators/to_clickhouse)

The case plane currently filters, sorts, and aggregates on nothing
beyond time — so the shape types nothing beyond time. When a real query
lane needs `metadata.correlation_uid` (say) as a typed column, promote
it with an operator-led live `ALTER` in the same lap as the DDL edit
(the D3/D4 pairing gate below).

### Attestations on every record

Every record both write lanes store carries the OCSF `record_integrity`
profile: `metadata.profiles` claims it, and `attestation_list[0]` holds
a SHA-256 fingerprint over the record's canonical serialization —
sorted-key strict JSON (`serialization: "tenzir-sorted-json"` in the
fingerprint object). The fingerprint covers the record exactly as
stored (stamped upstream of the INSERT — after `ocsf_derive` +
`ocsf_cast` on the investigations ingest, before the `to_clickhouse`
legs on the core node's archive rule), so a reader can recompute it
from the row alone: the catch-all reconstruction re-infers the JSON
values with their types, ClickHouse's key sorting is irrelevant
because the serialization canonicalizes field order, and only the
attestation's own fingerprint field is excluded from the hashed
content (the OCSF rule). Rows written before a plane's attestation lane
shipped carry no `attestation_list` — they predate the chain epoch and
are outside its guarantees; nothing in the table distinguishes them
except the absent field.

**Two planes, two chain scopes, one lane.** The generalized operators
live in the homelab package
([`packages/homelab/operators/record_integrity/`](../packages/homelab/operators/record_integrity/README.md));
the scope is the caller's. The investigations plane chains **per case**
(`chain_uid` = `metadata.correlation_uid`, the case spine) with one
attestation per record — `prev_event` inside its hash — and the caller
(the ingest pipeline's context legs) supplies every record's tail,
viable because the HTTP ingest paces one envelope at a time. The
detection plane chains **per node** (`chain_uid` = the chart-rendered
identity — `tenzir-node-core`, `tenzir-node-tetragon`,
`tenzir-node-netflow`; one chain across every class the node
archives, in time order) and stamps at archive
rate, which forced a different shape: the archive rules
receive whole batches every 5 minutes, and a live probe showed the
context-read chain mis-linking every record of a fast batch (the reads
run engine-batches ahead of the writes). The detection shape is the
OCSF two-attestation form: `attestation_list[0]` is the record
fingerprint (no `prev_event`, so the operator's internal lag carries
it to the next record in (time, uid) order — probed, 99,999/99,999
intra-batch links correct on a 100k batch), and `attestation_list[1]`
is the chain link (`prev_event` referencing the predecessor's record
fingerprint), carried **un-hashed** — fingerprint is a
recommended-not-required attribute, the engine has no channel to hash
it at the link's position, and its integrity is enforced by the verify
walk's adjacency check instead. A deleted link attestation masquerades
as a chain restart — the honest limit that buys batch-rate stamping.
The per-node chain also mints `metadata.uid` on every archived record
(the maps never set one; the verify walk's (time, uid) tie-break needs
it to reproduce the stamp order for same-second stamps).

**Read contract.** A reader treating a record as evidence may check:
(1) `attestation_list[0].fingerprint.value` equals the SHA-256 over
the canonical serialization of the record with the attestation's
fingerprint field removed (and, on the detection shape, the link
attestation stripped); (2) `prev_event.fingerprint.value` equals the
previous row's record fingerprint in time order per chain_uid. The
investigations node's `investigations-attest-verify` pipeline and the
three detection nodes' `*-attest-verify` pipelines (core, tetragon,
netflow) all do this on every
stored row in scope and emit a Detection Finding (2004) on any break
(content tamper, deletion, splice; the detection walks are rolling
24h windows and tolerate their own edge — the first record's
predecessor lives outside the read, and its link checks are skipped,
its fingerprint recompute is not). `ocsf.Network_Activity` is the one
table two nodes' archive rules write (tetragon's Network Activity arm
and the whole netflow collector), so both nodes' walks read it and
witness both per-node chains — the chain_uid groups inside the walk
keep the findings scoped, double coverage at bounded cost.

**The scheduled walk + the rails closure.** All four verify lanes are
`every 1h`-wrapped (the loader-pipeline shape: first walk at pipeline
start, then hourly; the detection walks keep their rolling 24h
windows, the investigations walk keeps the unwindowed whole-store
read), and
each break's finding rides two legs out: the raw record on the pod
logs (unchanged) and an `ocsf_derive` + `ocsf_cast`-dressed INSERT
into `ocsf.Detection_Finding` with the `tenzir` lake-writer user. The
finding is class-2004 schema-native (singular `finding_info`,
required by the class; severity 4), so it lands inside the unchanged
Grafana tenzir-findings rule's WHERE clauses — tamper evidence pages
through the agent_invoke bridge (homelab-agent -> the investigator)
instead of waiting for a human to read pod logs
([`../../../../03-services/observability/grafana/alerting/tenzir-findings.yaml`](../../../../03-services/observability/grafana/alerting/tenzir-findings.yaml);
the `detection-verify-finding` package test pins the shape against
that rule's SQL). While a break persists, each hourly walk re-emits
its finding (append-only evidence — no update or delete path exists
on either store) and the rule re-pages until the tamper is
remediated. The written findings carry no attestation: the chains
cover archive-rule writes (the three detection nodes) and
`investigations.records` (investigations), and these rows bypass
every stamping point — the investigations and core walks read them
back and skip them as unattested rows, the same pre-epoch path, and
the tetragon/netflow walks never read `ocsf.Detection_Finding` at all
(their scope is their own archive classes), so no lane ever
self-feeds.

**The node-restart gap.** Chain linkage is stamped from per-node
in-memory state (the `investigations-chains` / `detection-chains` /
`tetragon-chains` / `netflow-chains` contexts), so it is best-effort
per node lifetime: a node restart loses the context, and the next
record restarts its chain with `prev_event` absent (plus a write-time
WARNING — on the detection plane one per node boot, the chain's epoch
marker). The verify walk treats a mid-chain record without a link as
that documented restart, not a break — and detecting that shape
structurally (the attest stamping contract: two attestations on
linked records, one on restarts) is load-bearing: on a homogeneous
batch — one class table, the shape every node's verify lane reads —
schema unification lets the siblings' element schema type the
out-of-bounds link access, and the string-typed fingerprint path
reads as the empty string instead of null, which flagged a false
`chain_link_mismatch` on every post-restart record until the length
guard landed (probed on the netflow node's fixture, v6.19.1; the
`netflow-verify-tamper` baseline now pins the restart silence).
Post-hoc mutation is still caught across restarts by the per-record
fingerprint check, but the linkage gap around a
restart cannot be reconstructed. Two honest limits remain: a chain
tail deletion (no successor references the newest record) is
invisible to any unanchored hash chain, and rows predating the epoch
have no attestation at all. The detection plane adds a third: a
record arriving more than one retention window late (ingestion lag
beyond 15 minutes) zigzags the chain at its seam, and the walk flags
the successor — a triage signal, not a break in the stored content.

**The stamping cost, measured.** The detection plane's volume splits
across its nodes: k8s-audit alone has 22M+ archived API Activity rows
(core), and the tetragon flood is the fleet's biggest-volume class
(the 50,747-partition ENOSPC). Stamping runs on every one of them
(per archive pass), so the cost is measured per shape, not assumed:
the homelab package's 100k-record harnesses time each archive leg end
to end. Core (`detection-throughput`, API Activity): ~3s for 100k
realistic records on an M-series laptop ≈ 33k
records/s standalone, ~28k records/s against a live node with the
context and fork legs, ~19µs/record marginal over the sort-only
baseline. Tetragon (`tetragon-throughput`, Process Activity — the
fatter records): ~7s for 100k ≈ 14k records/s, ~11µs/record marginal,
the sort dominating at flood scale; the one-off tetragon-scale probes
pushed it to the pass arithmetic: 250k (the peak-drain 5-minute pass
at 800 ev/s) in ~20s, and a full 15-minute window at the extreme
(750k) in ~5.5-6 min — longer than the 5-minute pass interval, so a
sustained extreme drain stacks archive passes until the drain relents
(the honest pass-stacking trade; at the measured steady rate of ~74
ev/s the pass stamps in ~2s). At the current rates every node has
orders of magnitude of headroom; each throughput test's floor assert
fails loudly if its leg regresses past it. The class-scoped
alternative (stamping only the low-volume classes and leaving
API Activity or the flood classes unattested) stays out: the issue
asks for the whole bus,
and the numbers say the whole bus is affordable; if the operator later
disagrees, the attest call in each `ocsf-archive.tql` is one `where`
away from any scope-down.

### Write path

```mermaid
flowchart LR
    AG["agent (kagent / hermes-agent ns)"] -->|"POST case/evidence envelope :8080"| AH["investigations node<br/>accept_http"]
    AH -->|"homelab::investigations::ocsf::map<br/>validates + stamps OCSF spine"| MAP["ocsf_derive / ocsf_cast"]
    MAP -->|"attest: record_integrity fingerprint<br/>chain per case (node memory)"| AT["attest + context legs"]
    AT -->|"to_clickhouse (writer user,<br/>INSERT + SELECT)"| CH["ClickHouse investigations.records<br/>(3 replicas, ReplicatedMergeTree)"]
    CH -->|"7d TTL TO VOLUME 'cold'<br/>(ocsf tables; records is TTL-free)"| COLD["cold tier: rustfs<br/>tenzir bucket, clickhouse prefix"]
    AG -.->|"query-lane read-back<br/>(reader user, SELECT)"| CH
    CH -.->|"investigations-attest-verify walk<br/>every 1h (reader user, SELECT)"| VFY["Detection Finding 2004<br/>on any chain break"]
    VFY -->|"ocsf_derive/cast + INSERT<br/>(tenzir user, ocsf.*)"| DF["ocsf.Detection_Finding"]
    DF -->|"Grafana tenzir-findings rule<br/>(sev>=4, agent_invoke)"| AG
```

The investigations README owns the envelope contract and the lane
containment ([nodes/investigations](../nodes/investigations/README.md)).

## The typed-column trap (the failure class the shape kills)

The shape is not minimalism for its own sake — it is the direct product
of the 2026-10-18 boot-abort incident
([docs/issues/ocsf-clickhouse-ddl-convergence-and-broken-parts.md](../../../../../../docs/issues/ocsf-clickhouse-ddl-convergence-and-broken-parts.md)):

- `startup_scripts` executes sequentially and aborts at the FIRST
  failing query. Every typed column is a place where the DDL in git and
  the live table structure can diverge; when they do, the whole file
  aborts at boot and NOTHING gets created — including
  `investigations.records`.
- The ocsf tables hit exactly that: `class_uid` was retyped twice
  (UInt32 → Int32 across the corpus), a `severity_id` Int8 align touched
  nine CREATEs at once, and the LowCardinality/Nullable wrappings each
  needed their own live `ALTER` convergence. Each DDL edit without the
  paired live `ALTER` was a boot-abort in waiting.

A table whose only typed column is `time` cannot diverge: envelope
evolution and OCSF schema churn land inside the JSON where ClickHouse's
JSON type absorbs them without DDL. The ocsf tables keep their tuned
hand-DDL (they pay the convergence tax for dashboard hot paths); their
DDL/live convergence story is tracked in the issue above.

## Storage layout

```mermaid
flowchart LR
    subgraph HOT["hot tier (~7 days)"]
        PVC0["chi replica 0<br/>Longhorn PVC 100Gi<br/>/var/lib/clickhouse/hot/"]
        PVC1["chi replica 1<br/>Longhorn PVC 100Gi<br/>/var/lib/clickhouse/hot/"]
        PVC2["chi replica 2<br/>Longhorn PVC 100Gi<br/>/var/lib/clickhouse/hot/"]
    end
    subgraph KEEP["Keeper quorum"]
        K["3-node ensemble<br/>Longhorn PVCs, 5Gi"]
    end
    subgraph RUSTFS["rustfs (NAS)"]
        S3["tenzir bucket<br/>clickhouse/ prefix<br/>storage.services.apocrathia.com:9009"]
    end
    PVC0 -->|"part moves after 7d TTL<br/>(each replica uploads its own copy)"| S3
    PVC1 -->|"same"| S3
    PVC2 -->|"same"| S3
    K -.->|"replication metadata"| PVC0
    K -.->|"replication metadata"| PVC1
    K -.->|"replication metadata"| PVC2
```

- **Bucket layout**: cold parts write to the `tenzir` rustfs bucket under
  the `clickhouse/` prefix
  (`http://storage.services.apocrathia.com:9009/tenzir/clickhouse/`) —
  the ClickHouse data lake lives in the tenzir app's bucket, creds from
  the `tenzir-secrets` item (`aws-access-key-id` /
  `aws-secret-access-key`, rendered by
  [`../secret.yaml`](../secret.yaml) — the same single render the Tenzir
  nodes read; the store's old clickhouse-namespace duplicate render went
  away with the relocation).
- **3x cold growth**: each replica runs the same tiered policy and
  uploads its own copy of every cold part — the bucket grows ~3x the
  single-node shape.
- **Retention** (ocsf tables): 7 days → `TO VOLUME 'cold'` (part
  moves; was 90 days until 2026-10-27 — the observed ~9.4 GiB/day per
  replica put the 90-day window at ~850 GiB, past the 100Gi hot PVC;
  7 days ≈ ~66 GiB steady on 100Gi), then per-table `DELETE` horizons
  (operator decision 2026-10-29; operator-tunable: change the
  `INTERVAL ... DAY DELETE` in `config/10-startup-scripts.xml` for new
  installs, `ALTER TABLE ... MODIFY TTL` server-side for live tables) —
  400 days on every class table, 90 days on `ocsf.Network_Activity`
  alone (netflow + tetragon flows). `ttl_only_drop_parts = 1` keeps
  the delete a cheap partition drop.
  `investigations.records` has NO TTL by design — a case record is a
  durable audit record.
- **Partition layout** (ocsf class tables): `PARTITION BY
toYYYYMM(time)` — monthly, changed from daily `toDate(time)` on
  2026-10-29. Reason: part-count pressure — daily meant up to ~400
  partitions per table at the 400-day horizon, the tetragon node's
  50,747-partition ENOSPC (2026-10-12) is the fleet's measured lesson
  in what partition bloat costs, and the vendor tutorial's guidance is
  keep partitions in the hundreds
  ([tutorial](../.agents/skills/tenzir/tutorials/build-an-ocsf-lake-with-clickhouse.md));
  monthly is a handful of partitions per table in steady state. Sort
  keys are unchanged. Two consequences to know: with monthly parts and
  `ttl_only_drop_parts` a `DELETE` horizon lands whole-month late at
  most (rows can wait up to a month past their age for their part to
  drop), and partition keys have no live `ALTER` — the live cutover
  plan is
  [`docs/plans/ocsf-monthly-partition-cutover.md`](../../../../../../docs/plans/ocsf-monthly-partition-cutover.md)
  (tracked as
  [`docs/issues/ocsf-live-monthly-cutover.md`](../../../../../../docs/issues/ocsf-live-monthly-cutover.md)).
- **PVC-only metadata**: schema metadata (incl. S3 disk metadata under
  `/var/lib/clickhouse/disks/`) lives on the PVC only — losing all
  three PVCs orphans the S3 parts. Replication (3 copies) is the
  resilience mechanism; there is no kopiur/snapshot wiring on these
  PVCs by design.

## Schema at a glance

Canonical definition: `config/10-startup-scripts.xml`. This section
describes the shape this MR lands (monthly partitions, per-class
`DELETE` horizons). Live tables created before the change drift until
the cutover runs
([`docs/issues/ocsf-clickhouse-ddl-convergence-and-broken-parts.md`](../../../../../../docs/issues/ocsf-clickhouse-ddl-convergence-and-broken-parts.md)
tracks the general divergence class).

The diagrams are the structure — every table, every typed
column, split into four small renders so each box stays
readable (one monster ER diagram renders too small to read).
Attribute names underscore the OCSF field paths (the exact
dotted paths are in the per-class reference below); `time` is
the partition and sort spine on every table. Who writes and
reads each table lives in the reference list and the node
READMEs — the plumbing is deliberately not drawn here.

**Identity and API classes (core feeds)**

```mermaid
erDiagram
    ocsf_API_Activity {
        DateTime64 time PK "partition + sort spine"
        Int32 class_uid "6003"
        Int8 severity_id
        String actor_user_name "actor.user.name"
        String api_operation "api.operation"
        String metadata_product_name
        IPv6 src_endpoint_ip "src_endpoint.ip"
        JSON unmapped "source residue"
        JSON event "tenzir catch-all"
    }
    ocsf_Authentication {
        DateTime64 time PK
        Int32 class_uid "3002"
        Int8 severity_id
        Int8 status_id
        String actor_user_name
        IPv6 src_endpoint_ip
        String metadata_product_name
        JSON unmapped
        JSON event
    }
    ocsf_Account_Change {
        DateTime64 time PK
        Int32 class_uid "3001"
        Int8 severity_id
        String actor_user_name
        IPv6 src_endpoint_ip
        String metadata_product_name
        JSON unmapped
        JSON event
    }
    ocsf_Base_Event {
        DateTime64 time PK
        Int32 class_uid "0"
        String class_name
        Int8 activity_id
        Int8 severity_id
        String metadata_product_name
        String device_hostname
        JSON unmapped
        JSON event
    }
```

**Findings (sigma, trivy, the verify walks)**

```mermaid
erDiagram
    ocsf_Detection_Finding {
        DateTime64 time PK
        Int32 class_uid "2004"
        Int8 severity_id
        Int8 status_id
        String uid
        String rule_id
        String subject_kind
        String subject_name
        String subject_namespace
        String finding_info_title
        String finding_info_uid
        String metadata_product_name
        JSON unmapped
        JSON event
    }
    ocsf_Vulnerability_Finding {
        DateTime64 time PK
        Int32 class_uid "2002"
        Int8 severity_id
        String finding_info_title
        String metadata_product_name
        JSON unmapped
        JSON event
    }
```

**Endpoint telemetry (tetragon, netflow, intel)**

```mermaid
erDiagram
    ocsf_Network_Activity {
        DateTime64 time PK "DELETE horizon 90d, not 400d"
        Int32 class_uid "4001"
        Int8 severity_id
        IPv6 src_endpoint_ip
        IPv6 dst_endpoint_ip
        Int64 traffic_bytes "traffic.bytes"
        String metadata_product_name
        JSON unmapped
        JSON event
    }
    ocsf_Process_Activity {
        DateTime64 time PK
        Int32 class_uid "1007"
        Int8 activity_id
        Int8 severity_id
        String process_path "process.path"
        String device_hostname
        String metadata_product_name
        JSON unmapped
        JSON event
    }
    ocsf_File_System_Activity {
        DateTime64 time PK
        Int32 class_uid "1001"
        Int8 severity_id
        String file_path
        String file_xattributes_permission
        String actor_process_path
        String actor_process_container_name
        String device_hostname
        String metadata_product_name
        JSON unmapped
        JSON event
    }
    ocsf_OSINT_Inventory_Info {
        DateTime64 time PK
        Int32 class_uid "5021"
        Int8 severity_id
        Int8 status_id
        String metadata_product_name
        JSON unmapped
        JSON event
    }
```

**The non-class tables**

```mermaid
erDiagram
    ocsf_fleet_assets {
        String uuid PK "ORDER BY uuid"
        String hostname
        String display_name
        IPv6 primary_ip
        String primary_mac
        String platform
        String os_version
        String osquery_version
        String hardware_serial
        String hardware_model
        String hardware_vendor
        String computer_name
        String status
        DateTime64 last_seen "ReplacingMergeTree version, TTL 400d"
        JSON event
    }
    investigations_records {
        DateTime64 time PK "partition + sort spine"
        JSON event "tenzir catch-all — the only data column"
    }
```

### The common class-table shape

Every `ocsf.<Class_Name>` table is the same skeleton plus the class's
query-hot typed columns:

- `time DateTime64(9, 'UTC') CODEC(Delta, ZSTD)` — the partition and
  sort spine
- `class_uid Int32 DEFAULT 0` and `severity_id Int8 DEFAULT 0`
- the class's typed hot columns (the table below)
- `unmapped JSON CODEC(ZSTD(3))` — source residue without an OCSF
  home
- `event JSON COMMENT 'tenzir:catch_all' CODEC(ZSTD(3))` — everything
  else
- `ReplicatedMergeTree`, `PARTITION BY toYYYYMM(time)`,
  `ORDER BY (class_uid, time)`, TTL `time + 7 DAY TO VOLUME 'cold'`
  then `DELETE` at the table's horizon (400 days; Network Activity 90),
  `storage_policy = 'tiered'`, `ttl_only_drop_parts = 1`

### Per-class reference

- **`ocsf.API_Activity`** (6003, 400d) — columns: `actor.user.name`,
  `api.operation`, `src_endpoint.ip`, `metadata.product.name`; writer:
  core `k8s-audit-ocsf`.
- **`ocsf.Authentication`** (3002, 400d) — columns: `status_id`,
  `actor.user.name`, `src_endpoint.ip`, `metadata.product.name`;
  writer: core `authentik-ocsf`.
- **`ocsf.Account_Change`** (3001, 400d) — columns:
  `actor.user.name`, `src_endpoint.ip`, `metadata.product.name`;
  writer: core `authentik-ocsf`.
- **`ocsf.Base_Event`** (0, 400d) — columns: `class_name`,
  `activity_id`, `metadata.product.name`, `device.hostname`; writers:
  core `authentik-ocsf`, core `fleet-ocsf`.
- **`ocsf.Detection_Finding`** (2004, 400d) — columns: `status_id`,
  `uid`, `rule_id`, `subject_kind`, `subject_name`,
  `subject_namespace`, `finding_info.title`, `finding_info.uid`,
  `metadata.product.name`; writers: core `trivy-ocsf` +
  `sigma-detect`, plus the four attest-verify walks on chain breaks.
- **`ocsf.Vulnerability_Finding`** (2002, 400d) — columns:
  `finding_info.title`, `metadata.product.name`; writer: core
  `trivy-ocsf`.
- **`ocsf.Network_Activity`** (4001, **90d**) — columns:
  `src_endpoint.ip`, `dst_endpoint.ip`, `traffic.bytes`,
  `metadata.product.name`; writers: netflow `netflow-ingest`, tetragon
  `tetragon-ocsf`.
- **`ocsf.Process_Activity`** (1007, 400d) — columns: `activity_id`,
  `process.path`, `device.hostname`, `metadata.product.name`; writer:
  tetragon `tetragon-ocsf`.
- **`ocsf.File_System_Activity`** (1001, 400d) — columns:
  `file.path`, `file.xattributes.permission`, `actor.process.path`,
  `actor.process.container.name`, `device.hostname`,
  `metadata.product.name`; writer: tetragon `tetragon-ocsf`.
- **`ocsf.OSINT_Inventory_Info`** (5021, 400d) — columns:
  `status_id`, `metadata.product.name`; writers: intel
  `opencti-taxii-factory-walk` / `-poll`.

### The two non-class tables

- **`ocsf.fleet_assets`** — the enrichment factory's output, not an
  event table: `ReplicatedReplacingMergeTree(last_seen)`,
  `ORDER BY uuid`, `TTL last_seen + INTERVAL 400 DAY DELETE`. One row
  per Fleet host, hourly refresh; consumers read `FINAL`.
- **`investigations.records`** — the case/evidence record:
  `time` plus the `event` catch-all and nothing else typed,
  `PARTITION BY toYYYYMM(time)`, `ORDER BY (time)`, **no TTL** (a case
  record is a durable audit record).

### The stray

`ocsf.\`null\``is not a lane:`to_clickhouse`created it when
records reached a write leg with a null`class_name` (the tetragon
pipeline now guards its table f-string against exactly that). It stays
in the bootstrap file and on the cluster until its disposition is
decided; no pipeline writes it today.

## Schema bootstrap

`config/10-startup-scripts.xml` uses ClickHouse `startup_scripts` (the
Altinity-documented bootstrap mechanism; runs on every server start,
per replica, no `ON CLUSTER`): idempotent `CREATE DATABASE/TABLE IF NOT
EXISTS`, `ReplicatedMergeTree` with the operator-provided
`{installation}/{cluster}/{shard}/{replica}` macros. A replica with a
fresh PVC re-CREATEs and re-attaches to its Keeper replica path, then
re-syncs from its siblings.

- **Ordering is load-bearing**: investigations DDL runs FIRST so a
  failing ocsf CREATE cannot starve `investigations.records` of its
  bootstrap (the e29638e74 fix; see the ORDERING comment in the XML).
- **D3/D4 pairing gate**: init scripts never ALTER existing tables.
  Schema evolution is operator-led: a DDL edit ships its live `ALTER`s
  in the same lap, or the next boot aborts the whole file (the trap
  above).
- **Caveat**: `throw_on_error` stays false (reads survive Keeper
  outages), so a boot-time failure does not block the server — verify
  after any apply:

```bash
kubectl exec -n tenzir chi-tenzir-ocsf-0-0-0 -- \
  clickhouse-client --query "SHOW TABLES FROM ocsf"
```

### Adding a class (ocsf tables only)

1. Add a `CREATE TABLE IF NOT EXISTS ocsf.<Class_Name>` block to
   `config/10-startup-scripts.xml` — never to `cluster.yaml`. Use the
   house shape: `PARTITION BY toYYYYMM(time)` (monthly, since
   2026-10-29); the `DELETE` horizon is a per-table choice now —
   400 days by default, 90 on `ocsf.Network_Activity`.
2. `kubectl exec` the `ALTER` on existing replicas if the class is not
   new (CREATE only runs on fresh data dirs otherwise).
3. Point the Tenzir pipeline at it (per-class table naming:
   `ocsf.{class_name.replace(" ", "_")}`).

`investigations.records` needs no class rows: it is the JSON catch-all
— envelope changes go through the investigations map operator, not DDL.

## Users (all in `cluster.yaml`, `spec.configuration.users`)

The operator renders these into `users.d` and injects the passwords as
env vars from the `tenzir-secrets` Secret; git only ever names
fields:

- `tenzir` (`clickhouse-password`) — SELECT, INSERT on `ocsf.*`
- `grafana` (`clickhouse-grafana-password`) — SELECT on `ocsf.*` +
  `investigations.*`
- `investigations-writer` (`clickhouse-investigations-writer-password`)
  — INSERT, SELECT on `investigations.*`
- `investigations-reader` (`clickhouse-investigations-reader-password`)
  — SELECT on `investigations.*` + `ocsf.*`

All four are pod CIDR + localhost only.

With a `grants` block present, access is exactly what is granted
(ClickHouse `<grants>` users.xml semantics); neither investigations
user can ALTER, TRUNCATE, or DROP — wipe is not a permitted operation on
this database. The `default` user stays network-restricted to the CHI's
own service FQDNs by the operator's `host_regexp` default.

## In-cluster endpoints

The operator creates the Services; name prefixes are fixed by its namer:

- `clickhouse-tenzir.tenzir.svc.cluster.local` - CR-level service,
  load-balanced over both replicas. HTTP 8123 (Grafana datasource),
  native TCP 9000 (Tenzir `to_clickhouse`).
- `chi-tenzir-ocsf-<shard>-<replica>` services - per-host (e.g.
  `chi-tenzir-ocsf-0-0`); ad-hoc `clickhouse-client` targets when you
  need a specific replica.
- Keeper services (`chk-tenzir-ocsf-...`) - operator-internal; the CHI
  references the Keeper CR by name and the operator wires the
  endpoints.

## OCSF references

- Vendored schema docs in-tree: the
  [`tenzir-ocsf` skill](../.agents/skills/tenzir-ocsf/SKILL.md)
  (classes, objects, attributes, profiles; version pages under
  [`.agents/skills/tenzir-ocsf/v1.9.0/`](../.agents/skills/tenzir-ocsf/v1.9.0/)).
- Upstream schema explorer: [ocsf-schema.com](https://ocsf-schema.com)
  (the vendored docs' own reference for browsing classes and objects).
- Tenzir's OCSF normalization and lake guidance:
  [`tenzir` skill](../.agents/skills/tenzir/SKILL.md)
  ([map-to-ocsf](../.agents/skills/tenzir/guides/normalize/map-to-ocsf.md),
  [build-an-ocsf-lake-with-clickhouse](../.agents/skills/tenzir/tutorials/build-an-ocsf-lake-with-clickhouse.md)).

## Validation

```bash
kustomize build flux/manifests/03-services/clickhouse > /dev/null
kustomize build flux/manifests/04-apps/security/tenzir/clickhouse > /dev/null
helm repo add altinity https://helm.altinity.com
helm template altinity-operator altinity/altinity-clickhouse-operator \
  --version 0.27.4 -n clickhouse \
  -f <(yq '.spec.values' flux/manifests/03-services/clickhouse/operator.yaml)
```

Both CRs were validated against the exact CRD schemas shipped in
operator chart 0.27.4; the DDL + tiered-policy XML were executed
end-to-end on `clickhouse-server:25.8.33.6` with a Keeper (tables,
grants enforcement, dotted-column inserts, TTL move-to-cold, 400d
delete cap, restart idempotency — see the plan's evidence notes in
[`docs/plans/clickhouse-rollout.md`](../../../../../../docs/plans/clickhouse-rollout.md)).
