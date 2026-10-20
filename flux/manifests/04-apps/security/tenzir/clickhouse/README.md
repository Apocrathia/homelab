# ClickHouse datalake — the OCSF lake and investigations store

The custom resources behind the `ocsf` query store and the investigations
`records` table: the ClickHouseInstallation (CHI) `tenzir`, its Keeper
ensemble, the credentials renders, and the extracted server config. The
cluster is nested under the tenzir tree because its dedication is
structural — it exists to be this stack's datalake, and nothing else
writes here. The Altinity operator itself stays at the services root
([`03-services/clickhouse`](../../../../03-services/clickhouse/README.md));
this layer is its own Flux Kustomization (`services-clickhouse-cluster`)
gated on it.

> **Navigation**: [← Tenzir](../README.md) | [Investigations node](../nodes/investigations/README.md) | [Operator layer](../../../../03-services/clickhouse/README.md)

## Objects

| File                            | What it is                                                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `secret.yaml`                   | OnePasswordItem renders in this namespace: `clickhouse-secrets` (user passwords) + `tenzir-secrets` (S3 cold-tier creds)                            |
| `keeper.yaml`                   | ClickHouseKeeperInstallation `tenzir` - 3-node Keeper ensemble                                                                                      |
| `cluster.yaml`                  | ClickHouseInstallation `tenzir` - thin CHI: users, keeper ref, cluster layout, pod template; `files:` holds placeholder keys stitched at build time |
| `config/00-storage-tiered.xml`  | Tiered-storage policy: hot Longhorn PVC + cold S3 disk (the stitched source of truth)                                                               |
| `config/10-startup-scripts.xml` | Schema bootstrap: investigations DDL first, then the ocsf tables (the stitched source of truth)                                                     |
| `flux-kustomization.yaml`       | Flux Kustomization `services-clickhouse-cluster` (this layer's gate)                                                                                |
| `kustomization.yaml`            | kustomize assembly: configMapGenerator + replacements stitch for the two config files                                                               |

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
- `bootstrap-1password` - OnePasswordItem CRD + operator (renders `secret.yaml`).
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
detection plane chains **per node** (`chain_uid` =
`tenzir-node-core`, the chart-rendered identity — one chain across
every class this node archives, in time order) and stamps at archive
rate, which forced a different shape: the core node's archive rule
receives whole batches every 5 minutes, and a live probe showed the
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
core node's `detection-attest-verify` pipeline both do this on every
stored row in scope and emit a Detection Finding (2004) on any break
(content tamper, deletion, splice; the detection walk is a rolling
24h window and tolerates its own edge — the first record's predecessor
lives outside the read, and its link checks are skipped, its
fingerprint recompute is not).

**The node-restart gap.** Chain linkage is stamped from per-node
in-memory state (the `investigations-chains` / `detection-chains`
contexts), so it is best-effort per node lifetime: a node restart
loses the context, and the next record restarts its chain with
`prev_event` absent (plus a write-time WARNING — on the detection
plane one per node boot, the chain's epoch marker). The verify walk
treats a mid-chain record without a link as that documented restart,
not a break — post-hoc mutation is still caught across restarts by
the per-record fingerprint check, but the linkage gap around a
restart cannot be reconstructed. Two honest limits remain: a chain
tail deletion (no successor references the newest record) is
invisible to any unanchored hash chain, and rows predating the epoch
have no attestation at all. The detection plane adds a third: a
record arriving more than one retention window late (ingestion lag
beyond 15 minutes) zigzags the chain at its seam, and the walk flags
the successor — a triage signal, not a break in the stored content.

**The stamping cost, measured.** The detection plane's volume is the
core node's: k8s-audit alone has 22M+ archived API Activity rows.
Stamping runs on every one of them (per archive pass), so the cost is
measured, not assumed: the homelab package's 100k-record harness
(`detection-throughput`) times the archive leg end to end — ~3s for
100k realistic API Activity records on an M-series laptop ≈ 33k
records/s standalone, ~28k records/s against a live node with the
context and fork legs, ~19µs/record marginal over the sort-only
baseline. At the current audit rate the 5-minute pass has orders of
magnitude of headroom; the throughput test's floor assert (100s for
100k) fails loudly if the leg regresses past it. The class-scoped
alternative (stamping only the low-volume classes and leaving
API Activity unattested) stays out: the issue asks for the whole bus,
and the numbers say the whole bus is affordable; if the operator later
disagrees, the attest call in `ocsf-archive.tql` is one `where` away
from any scope-down.

### Write path

```mermaid
flowchart LR
    AG["agent (kagent / hermes-agent ns)"] -->|"POST case/evidence envelope :8080"| AH["investigations node<br/>accept_http"]
    AH -->|"homelab::investigations::ocsf::map<br/>validates + stamps OCSF spine"| MAP["ocsf_derive / ocsf_cast"]
    MAP -->|"attest: record_integrity fingerprint<br/>chain per case (node memory)"| AT["attest + context legs"]
    AT -->|"to_clickhouse (writer user,<br/>INSERT + SELECT)"| CH["ClickHouse investigations.records<br/>(2 replicas, ReplicatedMergeTree)"]
    CH -->|"90d TTL TO VOLUME 'cold'<br/>(ocsf tables; records is TTL-free)"| COLD["cold tier: rustfs<br/>tenzir bucket, clickhouse prefix"]
    AG -.->|"query-lane read-back<br/>(reader user, SELECT)"| CH
    CH -.->|"investigations-attest-verify walk<br/>(reader user, SELECT)"| VFY["Detection Finding 2004<br/>on any chain break"]
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
    subgraph HOT["hot tier (~90 days)"]
        PVC0["chi replica 0<br/>Longhorn PVC 100Gi<br/>/var/lib/clickhouse/hot/"]
        PVC1["chi replica 1<br/>Longhorn PVC 100Gi<br/>/var/lib/clickhouse/hot/"]
    end
    subgraph KEEP["Keeper quorum"]
        K["3-node ensemble<br/>Longhorn PVCs, 5Gi"]
    end
    subgraph RUSTFS["rustfs (NAS)"]
        S3["tenzir bucket<br/>clickhouse/ prefix<br/>storage.services.apocrathia.com:9009"]
    end
    PVC0 -->|"part moves after 90d TTL<br/>(each replica uploads its own copy)"| S3
    PVC1 -->|"same"| S3
    K -.->|"replication metadata"| PVC0
    K -.->|"replication metadata"| PVC1
```

- **Bucket layout**: cold parts write to the `tenzir` rustfs bucket under
  the `clickhouse/` prefix
  (`http://storage.services.apocrathia.com:9009/tenzir/clickhouse/`) —
  the ClickHouse data lake lives in the tenzir app's bucket, creds from
  the `tenzir-secrets` item (`aws-access-key-id` /
  `aws-secret-access-key`, rendered in this namespace by
  [`secret.yaml`](./secret.yaml); the same item the tenzir namespace
  renders — one item, multiple OnePasswordItem CRs). The old
  clickhouse-bucket-user keys on `clickhouse-secrets` are unused now;
  the operator removes them.
- **2x cold growth**: each replica runs the same tiered policy and
  uploads its own copy of every cold part — the bucket grows ~2x the
  single-node shape.
- **Retention** (ocsf tables): 90 days → `TO VOLUME 'cold'` (part
  moves), 400 days → `DELETE` (horizon cap, operator-tunable: change
  `INTERVAL 400 DAY` in `config/10-startup-scripts.xml` for new
  installs; `ALTER TABLE ... MODIFY TTL` server-side for live tables).
  `ttl_only_drop_parts = 1` keeps the delete a cheap partition drop.
  `investigations.records` has NO TTL by design — a case record is a
  durable audit record.
- **PVC-only metadata**: schema metadata (incl. S3 disk metadata under
  `/var/lib/clickhouse/disks/`) lives on the PVC only — losing BOTH
  PVCs orphans the S3 parts. Replication (2 copies) is the resilience
  mechanism; there is no kopiur/snapshot wiring on these PVCs by
  design.

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
kubectl exec -n clickhouse chi-tenzir-ocsf-0-0-0 -- \
  clickhouse-client --query "SHOW TABLES FROM ocsf"
```

### Adding a class (ocsf tables only)

1. Add a `CREATE TABLE IF NOT EXISTS ocsf.<Class_Name>` block to
   `config/10-startup-scripts.xml` — never to `cluster.yaml`.
2. `kubectl exec` the `ALTER` on existing replicas if the class is not
   new (CREATE only runs on fresh data dirs otherwise).
3. Point the Tenzir pipeline at it (per-class table naming:
   `ocsf.{class_name.replace(" ", "_")}`).

`investigations.records` needs no class rows: it is the JSON catch-all
— envelope changes go through the investigations map operator, not DDL.

## Users (all in `cluster.yaml`, `spec.configuration.users`)

The operator renders these into `users.d` and injects the passwords as
env vars from the `clickhouse-secrets` Secret; git only ever names
fields:

| User                    | Password vault field                        | Grants                                  | Networks             |
| ----------------------- | ------------------------------------------- | --------------------------------------- | -------------------- |
| `tenzir`                | `clickhouse-password`                       | SELECT, INSERT on `ocsf.*`              | pod CIDR + localhost |
| `grafana`               | `clickhouse-grafana-password`               | SELECT on `ocsf.*` + `investigations.*` | pod CIDR + localhost |
| `investigations-writer` | `clickhouse-investigations-writer-password` | INSERT, SELECT on `investigations.*`    | pod CIDR + localhost |
| `investigations-reader` | `clickhouse-investigations-reader-password` | SELECT on `investigations.*` + `ocsf.*` | pod CIDR + localhost |

With a `grants` block present, access is exactly what is granted
(ClickHouse `<grants>` users.xml semantics); neither investigations
user can ALTER, TRUNCATE, or DROP — wipe is not a permitted operation on
this database. The `default` user stays network-restricted to the CHI's
own service FQDNs by the operator's `host_regexp` default.

## In-cluster endpoints

The operator creates the Services; name prefixes are fixed by its namer:

- `clickhouse-tenzir.clickhouse.svc.cluster.local` - CR-level service,
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
