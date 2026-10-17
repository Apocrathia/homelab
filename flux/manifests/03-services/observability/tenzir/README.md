# Tenzir

> **Navigation**: [← Observability](../README.md) | [Core node](./nodes/core/README.md) | [Tetragon node](./nodes/tetragon/README.md) | [Netflow node](./nodes/netflow/README.md) | [Detections](./detections/README.md) | [.agents](./.agents/README.md) | [Upstream docs](https://tenzir.com/docs/)

Three standalone Tenzir nodes in namespace `tenzir`; Tenzir has no
distributed mode, so each node is a process with its own lake and its own
pipelines. The [core node](./nodes/core/README.md) is the detection plane:
it normalizes kube-apiserver audit, authentik, fleet, and trivy feeds to a
unified OCSF bus, runs one sigma pass over it, and owns the archive. The
[tetragon node](./nodes/tetragon/README.md) owns only the tetragon export
flood, and the [netflow node](./nodes/netflow/README.md) owns only the
NetFlow collector (UniFi exporters behind `tenzir-ingest-lb`), so neither
feed's lifecycle can starve or disturb detection.

All three nodes register into one hosted Tenzir Platform workspace
(app.tenzir.com) over a single outbound WebSocket. Pipelines run entirely
on the nodes; the events flowing through them never route through the
platform.

## Architecture

Three planes: live detection runs in-node (feeds publish OCSF events onto
the bus, sigma evaluates them as they arrive); findings and events live in
the one OCSF dataset at `s3://tenzir/ocsf/`, class-partitioned parquet on
rustfs; querying and alerting live in Grafana over MotherDuck, which reads
the parquet directly. Grafana owns notifications; there is no other
findings egress. The class taxonomy and the bus semantics live in
[`detections/README.md`](./detections/README.md).

ClickHouse is becoming the OCSF query store: the nodes' `ocsf-archive`
rules dual-write (MR-3, rollout plan
[`docs/plans/clickhouse-rollout.md`](../../../../../docs/plans/clickhouse-rollout.md))
— every archived batch lands in the per-class `ocsf.<Class_Name>` tables
on the ClickHouse OCSF cluster alongside the unchanged parquet. The
transition window keeps the parquet lane flowing as the dashboards'
comparison oracle until the MR-5 cut-over; until then Grafana still
queries MotherDuck.

```mermaid
flowchart LR
    SRC["sources"] -->|"OTLP · HTTP · NetFlow"| IN[listener]

    subgraph NODE["tenzir node — one per role"]
        IN --> PARSE["parse (homelab TQL package)"]
        PARSE --> OCSF["normalize to OCSF"]
        OCSF --> BUS["ocsf topic (the bus)"]
        BUS --> SIGMA["sigma detection"]
        SIGMA -->|"findings"| LAKE["node lake (15-minute hot window)"]
        OCSF --> LAKE
    end

    LAKE -->|"after 15 min"| RUST["rustfs parquet · s3://tenzir/ocsf/<br/>class_uid-partitioned"]
    LAKE -->|"after 15 min, fork"| CH["ClickHouse ocsf.* tables<br/>(OCSF query store, accumulating)"]
    RUST -.->|"reads"| GRAF["Grafana over MotherDuck<br/>(querying + alerting)"]
    NODE -.-> PLAT["Tenzir Platform"]
```

The chart is the whole topology: feeders, the bus, sigma, the lake, the
archive, and the Grafana query plane. Nothing else consumes findings.

## Secrets

1Password item `tenzir-secrets` (`vaults/Secrets/items/tenzir-secrets`)
renders the `tenzir-secrets` Secret. Vault field labels are kebab-case
and the rendered Secret keys match them:

- `aws-access-key-id` / `aws-secret-access-key`: rustfs bucket-scoped
  user for the `tenzir` bucket (see the [rustfs bucket/user creation
  doc](../../../../../docs/infrastructure/rustfs-bucket-user-creation.md);
  bucket and user creation is an operator step)
- `discord-webhook-url`: unused by the manifests; the vault field stays
  for the operator's off-repo use
- `authentik-events-token`: the ak-tenzir events pull token, minted by
  the tofu pair ([`crossplane.yaml`](./crossplane.yaml) +
  [`authentik.tf`](./authentik.tf)); the operator copies the key into the
  vault after the first apply
- `core-token` / `tetragon-token` / `netflow-token`: the pre-provisioned
  Tenzir Platform node tokens, one per node

A second item, `clickhouse-secrets`, renders the `clickhouse-secrets`
Secret in this namespace (MR-3; the same item the clickhouse namespace
renders — one item, multiple OnePasswordItem CRs). Its `clickhouse-password`
field is the ClickHouse `tenzir` writer password all three nodes read as
`TENZIR_SECRETS__CLICKHOUSE_PASSWORD` for the `to_clickhouse` archive
legs. The operator adds the value.

## Content

| Path                | Purpose                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `packages/homelab/` | TQL mapping package (`homelab`): OTLP parse, OCSF maps, the findings uid stamp, with tests                         |
| `detections/sigma/` | Sigma rules evaluated over the bus: homelab starters (OCSF field paths) + vendored SigmaHQ kubernetes-audit corpus |
| `detections/yara/`  | YARA scaffold: pinned signature-base submodule plus a vendored subset; no consumer pipeline yet                    |

Everything ships as ConfigMaps (`configMapGenerator` in
[`kustomization.yaml`](./kustomization.yaml)) and mounts read-only into
the nodes' pods. Sigma hot-reloads rule files; mapping-package changes
need a pod restart.

### Running the package tests

```sh
TENZIR_BINARY="uvx tenzir@6.19.1" \
  uvx tenzir-test --root ./flux/manifests/03-services/observability/tenzir/packages
```

Pin the runner to the deployed engine version (the node image lives in
the node HelmReleases); the runner banner confirms the pin on every run.
All baselines must stay warning-free.

## Storage lifecycle

The local lakes keep 15 minutes; every OCSF class that can name itself
archives to the one rustfs dataset at `s3://tenzir/ocsf/` as
class-partitioned parquet and expires locally. The lake is a transit
buffer between ingest and the archive, not a query surface; the parquet
is the record. DuckDB and MotherDuck read it as one table:

```sql
read_parquet('s3://tenzir/ocsf/**/*.parquet', hive_partitioning = true,
             union_by_name = true)
```

Detail lives in the node READMEs.
