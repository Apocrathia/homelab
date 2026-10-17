# ClickHouse - OCSF query store

[Altinity Kubernetes Operator for ClickHouse](https://github.com/Altinity/clickhouse-operator)
manages a 1-shard, 3-replica ClickHouse cluster ("ocsf") with a 3-node
ClickHouse Keeper ensemble. Tiered storage keeps ~90 days hot on Longhorn
and moves older parts to the rustfs `tenzir` bucket; a TTL cap deletes
everything past the retention horizon. Live plan and slice breakdown:
[`docs/plans/clickhouse-rollout.md`](../../../../../docs/plans/clickhouse-rollout.md).

> **Navigation**: [<< Back to Observability README](../README.md)

## Objects

| File               | What it is                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `namespace.yaml`   | `clickhouse-system` namespace                                                                       |
| `helmrelease.yaml` | Altinity clickhouse-operator (chart installs the CRDs via hook)                                     |
| `secret.yaml`      | OnePasswordItem `clickhouse-secrets` (existing `tenzir-secrets` vault item, second materialization) |
| `keeper.yaml`      | ClickHouseKeeperInstallation `keeper` - 3-node ensemble                                             |
| `chi.yaml`         | ClickHouseInstallation `ocsf` - 1 shard x 3 replicas, users, tiered storage, schema bootstrap       |

The operator watches `clickhouse-system` only (`watchNamespaces`).

## In-cluster endpoints

The operator creates the Services; name prefixes are fixed by its namer:

- `clickhouse-ocsf.clickhouse-system.svc.cluster.local` - CR-level service,
  load-balanced over all three replicas. HTTP 8123 (Grafana datasource,
  MR-2), native TCP 9000 (Tenzir `to_clickhouse`, MR-3).
- `chi-ocsf-ocsf-<shard>-<replica>` services - per-host (e.g.
  `chi-ocsf-ocsf-0-0`); ad-hoc `clickhouse-client` targets when you need a
  specific replica.
- Keeper services (`chk-keeper-...`) - operator-internal; the CHI references
  the Keeper CR by name and the operator wires the endpoints.

## Users (all in `chi.yaml`, `spec.configuration.users`)

The operator renders these into `users.d` and injects the passwords as env
vars from the `clickhouse-secrets` Secret (1Password item
`vaults/Secrets/items/tenzir-secrets`); git only ever names fields:

| User      | Password vault field          | Grants on `ocsf.*` | Networks                                              |
| --------- | ----------------------------- | ------------------ | ----------------------------------------------------- |
| `tenzir`  | `clickhouse-password`         | SELECT, INSERT     | pod CIDR `10.42.0.0/16` + localhost (operator-merged) |
| `grafana` | `clickhouse-grafana-password` | SELECT             | pod CIDR `10.42.0.0/16` + localhost (operator-merged) |

With a `grants` block present, access is exactly what is granted
(ClickHouse `<grants>` users.xml semantics). The `default` user stays
network-restricted to the CHI's own service FQDNs by the operator's
host_regexp default.

## Storage tiers and retention

`config.d/00-storage-tiered.xml` (inside `chi.yaml`): storage policy
`tiered` = hot volume on the Longhorn PVC (`/var/lib/clickhouse/hot/`) +
cold volume as an S3 disk into the existing rustfs `tenzir` bucket
(`tenzir/clickhouse/` prefix) with the existing tenzir bucket-user creds
(`from_env`, no values in git). Each replica runs the same config, so each
replica uploads its own copy of every cold part - the bucket grows ~3x the
single-node shape; keep that in mind when watching rustfs capacity.

Retention (every table, in the DDL inside `chi.yaml`):

- **90 days -> `TO VOLUME 'cold'`** - parts move to rustfs automatically
  (part-level, can lag merges; prototype measured seconds on LAN rustfs).
- **400 days -> `DELETE`** - retention horizon cap, **operator-tunable**:
  change `INTERVAL 400 DAY` in `chi.yaml` for new installs; for live
  tables, `ALTER TABLE ... MODIFY TTL ...` server-side. Day partitions +
  `ttl_only_drop_parts = 1` keep the delete a cheap partition drop.
- Schema metadata (incl. S3 disk metadata under
  `/var/lib/clickhouse/disks/`) lives on the PVC only - losing ALL three
  PVCs orphans the S3 parts. Replication (3 copies) is the resilience
  mechanism; there is no kopiur/snapshot wiring on these PVCs by design.

## Schema bootstrap and evolution

`config.d/10-startup-scripts.xml` uses ClickHouse `startup_scripts`
(the Altinity-documented bootstrap mechanism; runs on every server start,
per replica, no `ON CLUSTER`): idempotent `CREATE DATABASE/TABLE IF NOT
EXISTS` for the `ocsf` database and one table per OCSF class
(`Base_Event` fallback landing table included - the archive rule also
writes class-0 events). Tables are `ReplicatedMergeTree` with the
operator-provided `{installation}/{cluster}/{shard}/{replica}` macros; a
replica with a fresh PVC re-CREATEs and re-attaches to its Keeper replica
path, then re-syncs from its siblings.

Column strategy per the rollout plan (D3): typed columns only for dashboard
hot paths (dotted names select nested input paths), `unmapped` as a JSON
column, and `event JSON COMMENT 'tenzir:catch_all'` absorbing every other
field so OCSF schema churn lands in JSON instead of dropping events.

**Caveat:** `startup_scripts` errors do not block server boot
(`throw_on_error` stays false so reads survive Keeper outages). If Keeper
is not yet serving when a replica first boots, the tables silently do not
get created until the next server restart. After any apply, verify:

```bash
kubectl exec -n clickhouse-system chi-ocsf-ocsf-0-0-0 -- \
  clickhouse-client --query "SHOW TABLES FROM ocsf"
```

Schema evolution is operator-led, never through these scripts: promote a
new typed column with `ALTER TABLE ... ADD COLUMN` server-side
(Tenzir picks up the change within its 30s table-description refresh);
init scripts never ALTER existing tables.

## Adding a class

1. Add a `CREATE TABLE IF NOT EXISTS ocsf.<Class_Name>` block to
   `config.d/10-startup-scripts.xml` in `chi.yaml`.
2. `kubectl exec` the `ALTER` on existing replicas if the class is not new
   (CREATE only runs on fresh data dirs otherwise).
3. Point the Tenzir pipeline at it (per-class table naming:
   `ocsf.{class_name.replace(" ", "_")}`).

## Validation

```bash
kustomize build flux/manifests/03-services/observability > /dev/null
helm repo add altinity https://helm.altinity.com
helm template altinity-operator altinity/altinity-clickhouse-operator \
  --version 0.27.4 -n clickhouse-system \
  -f <(yq '.spec.values' flux/manifests/03-services/observability/clickhouse/helmrelease.yaml)
```

Both CRs (`chi.yaml`, `keeper.yaml`) were validated against the exact CRD
schemas shipped in operator chart 0.27.4; the DDL + tiered-policy XML were
executed end-to-end on `clickhouse-server:25.8.33.6` with a Keeper
(tables, grants enforcement, dotted-column inserts, TTL move-to-cold, 400d
delete cap, restart idempotency - see the plan's evidence notes).
