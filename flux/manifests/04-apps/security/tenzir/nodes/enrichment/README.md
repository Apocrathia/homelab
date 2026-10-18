# Tenzir enrichment node

> **Navigation**: [← Tenzir](../README.md) | [Core node](../core/README.md) | [Investigations node](../investigations/README.md) | [Upstream docs](https://tenzir.com/docs/)

One process (HelmRelease `tenzir-node-enrichment`, rendering pod
`tenzir-node-enrichment`) reserved as the fleet's **context factory**:
the node whose pipelines build curated lookup tables — threat intel,
fleet assets, baselines — into the ClickHouse store, from where the
ingress nodes' loader pipelines pull them into their node-local
contexts. The factory is still empty: platform-registered, idle, zero
pipelines, no listeners. The factory content lands in
[`pipelines/`](./pipelines/README.md) from the first factory row on.

- **Pure puller, no ingest surface** — no `extraPorts`, no listener
  Service, no web server (and so no `certificate.yaml`): the chart
  renders only the main `tenzir-node-enrichment` Service on `:5158`
  for node RPC. All factory work is outbound (platform WebSocket now;
  TAXII pull and ClickHouse writes with the first factory row).
- **Deploys live** — this HelmRelease carries no `spec.suspend` and
  is the exception in the tree: the sibling nodes are currently
  suspended (cluster-side, out of band); the operator wants this node
  up while the factory is built.
- **Zero pipelines by design** — the `tenzir.pipelines` map is absent
  from the values, so the rendered config defines no pipelines and
  the node boots idle. Grounded: `helm template` against chart 0.1.0
  with no pipelines values renders a `tenzir.yaml` without the key,
  and the config schema starts exactly the pipelines defined under
  it — an absent map starts none. The first factory row adds the key
  together with its pipeline; no placeholder pipeline is shipped.

## Roadmap

1. **Intel factory — the first factory pipeline, pending engine 6.20
   GA**: the OpenCTI TAXII row pulls OpenCTI's TAXII 2.1 indicator
   collection into the `ocsf.OSINT_Inventory_Info` ClickHouse table
   (single pane: all CTI reaches tenzir via OpenCTI), with the core
   node's
   [opencti-osint-loader](../core/pipelines/opencti-osint-loader.tql)
   as the consumer half. The table and the loader ship now; the
   factory row itself is built and verified but held — its vendored
   upstream library package requires engine >= 6.20 while the fleet
   runs 6.19.1 — and lands as its own lap when renovate offers 6.20.
   The TAXII 2.1 export surface and collection are the opencti lane's
   slice-7 handoff
   ([opencti-deployment.md](../../../../../../../docs/issues/opencti-deployment.md)).
2. **`fleet_assets` factory pipeline**: pull host inventory from the
   Fleet REST API, fuse it into a stable asset table, and write it
   to ClickHouse. The ingress nodes then run the consumer half:
   `from_clickhouse` loaders feeding `context_update` into their
   node-local lookup-table contexts. This node gains the ClickHouse
   writer env wiring then (`TENZIR_SECRETS__CLICKHOUSE_
PASSWORD` from `clickhouse-secrets`, same shape as netflow) — no lap
   wires a secret it does not use.
3. **Threat intel — abuse.ch ThreatFox** IOC feed as a future second
   intel source into its own ClickHouse table plus ingress loaders;
   the factory pattern is proven by the OpenCTI row.
4. **Baselines** once the post-6.20 GA baseline capability lands.

**Scope exclusions** (stable design decisions, not lap gaps):

- No event-flow enrichment lives here. Enrichment of live events stays
  in-stream at the ingress nodes; this node only builds the reference
  data those in-stream steps read.
- The Geo Open MMDB stays per-node (each ingress node's geoip context
  loads its own copy; see netflow's `geo-open-loader`).
- Contexts remain per-node until cross-node contexts land (upstream
  target Q1 2027); until then the enrichment node produces the
  _source material_ in ClickHouse, and each node's loader owns its
  context state.

## Connectivity

```mermaid
flowchart LR
    EN["tenzir-node-enrichment<br/>(idle, zero pipelines)"] -->|"outbound WebSocket<br/>(platform registration)"| PLAT["Tenzir Platform<br/>(app.tenzir.com)"]
    EN -.->|"first factory row: from_http (OpenCTI TAXII, Fleet API)"| SRC["external sources"]
    EN -.->|"factory rows: to_clickhouse<br/>(lookup tables)"| CH["ClickHouse<br/>(factory output)"]
    CH -.->|"ingress loaders<br/>from_clickhouse -> context_update"| ING["ingress nodes<br/>(core / netflow / tetragon)"]
```

Dashed lanes are the factory-row shape; today the registration leg is
live alone.

## Lake and storage

The chart's StatefulSet `volumeClaimTemplate` provisions the node lake
as the `state-tenzir-node-enrichment-0` PVC (Longhorn via the cluster
default storage class) — the chart's own mechanism, same as every
sibling. `persistence.size: 5Gi`, no `storage.yaml`: the investigations
precedent covers this exact case — the node imports nothing yet, the
lake stays empty, and the PVC carries node state only. Netflow and
tetragon ship a `storage.yaml` for the Longhorn recurring-job
exclusion because their lakes are archived transit buffers; when a
factory row starts writing real content, revisit whether this PVC
wants the same exclusion (a one-file add, and its spec must mirror
the `persistence` values exactly).

## Sizing

The upstream size-a-node formula at idle volume (zero sources,
destinations, normalization): the `max(2, ·)` floor pins 2 cores and
the 2 GB RAM floor; requests small, limits justified in
[`helmrelease.yaml`](./helmrelease.yaml). Re-size when the first
factory pipeline lands.

## Bootstrap

Already done by the operator: the node is registered in the
app.tenzir.com workspace and its `tnz_...` token copied into the
`enrichment-token` field of the `tenzir-secrets` 1Password item
(`../secret.yaml` materializes the Secret in this namespace). There is
nothing else to provision — no API token to generate (no web server),
no ClickHouse user needed until the first factory row. The node comes
up on apply. The intel factory lap later wires one more vault field,
`opencti-taxii-token` (the TAXII bearer token, written by the opencti
lane and documented in [`../../secret.yaml`](../../secret.yaml); the node
does not read it until the row lands).

## Troubleshooting

```sh
kubectl exec -n tenzir tenzir-node-enrichment-0 -- \
  tenzir -e localhost:5158 'metrics "pipeline"'
kubectl logs -n tenzir tenzir-node-enrichment-0 | grep -i error
kubectl get helmrelease -n tenzir tenzir-node-enrichment
```
