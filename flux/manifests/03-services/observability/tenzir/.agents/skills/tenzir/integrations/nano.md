---
title: "nano integration"
description: "Run a lake-native SIEM on ClickHouse for search, detections, cases, and AI-assisted triage."
canonical: https://tenzir.com/integrations/nano
source: https://tenzir.com/integrations/nano.md
section: "Integrations"
---

# nano integration

> Run a lake-native SIEM on ClickHouse for search, detections, cases, and AI-assisted triage.

[nano](https://nano.rs) is a cloud-native SIEM that stores security telemetry in ClickHouse. Tenzir ships OCSF events into nano over the native ClickHouse protocol with [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md), writing each event in nano’s `{event, source_type}` wire shape into the `nanosiem.ocsf_logs_raw` ingest table.

Bundled Tenzir node

nano can bundle a Tenzir node for you: its installer’s “OCSF + Tenzir” option stands up a Tenzir node with this sink pre-wired, leaving you to own the source and the OCSF mapping in between. For worked source mappings (Sysmon, Windows Event Logs, Apache, CloudTrail, proxy), see nano’s [direct OCSF ingestion guide](https://nano.rs/docs/ocsf/integrations/direct-ocsf/).

## Write OCSF events to nano

nano accepts a single wire shape: a record with two fields.

| Field         | Type     | Notes                                                                                                                                  |
| ------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `event`       | `record` | The full OCSF 1.8.0 event. Must carry `class_uid` and `time` (epoch milliseconds). Fields with no OCSF home go under `event.unmapped`. |
| `source_type` | `string` | Lowercase per-feed identifier, such as `windows_sysmon`. A missing or uppercase value lands rows as `unknown`.                         |

If you already have a stream of OCSF events in Tenzir, forwarding it to nano is two steps: wrap each event in this shape, then write it to `nanosiem.ocsf_logs_raw` with [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md).

```tql
subscribe "ocsf"
this = {
  event: this,
  source_type: f"{metadata.product.vendor_name} {metadata.product.name}".to_lower().replace(" ", "_"),
}
to_clickhouse table="nanosiem.ocsf_logs_raw",
              host="clickhouse", port=9000,
              user="nanosiem_ingest",
              password=secret("NANO_INGEST_PASSWORD"),
              mode="append"
```

The `this = { event: this, source_type: ... }` assignment is the heart of the integration: it nests the entire OCSF record under `event` and adds a sibling `source_type` that names the feed. Because the `ocsf` topic multiplexes many sources, the example derives that name per event from the OCSF product metadata, lowercased with underscores as nano expects. nano stores that envelope, then derives the queryable `nanosiem.ocsf_logs` table from this entry point through a materialized view, so you only ever write the entry point, never `nanosiem.ocsf_logs` directly. Your record needs nothing beyond these two fields: ClickHouse fills the server-derived columns of `ocsf_logs_raw`, such as the `timestamp` and the row `id`, from their default expressions.

Note that nano persists a hot projection of the event (its promoted columns plus the OCSF `unmapped` object), not the raw event itself. If you need full-fidelity OCSF retention, route the same stream to an archive as well, such as per-class ClickHouse tables or object storage.

Sink arguments:

* `table` is `nanosiem.ocsf_logs_raw`, nano’s ingest entry point.
* `user` and `password` are nano’s INSERT-only [ingest credential](https://nano.rs/docs/ocsf/integrations/direct-ocsf/) (`nanosiem_ingest`).
* `mode="append"` writes into the existing table. The `json=` option is for table creation only and errors in `append` mode.
* TLS is on by default; use port `9440` for a remote cluster. For local testing against a plaintext deployment colocated with nano, add `tls=false`.

Where the OCSF stream comes from is up to you. When the input is raw logs rather than OCSF, [map it to OCSF](../guides/normalize/map-to-ocsf.md) 1.8.0 first; nano’s [direct OCSF ingestion guide](https://nano.rs/docs/ocsf/integrations/direct-ocsf/) has per-source mappings.

## Read events back from nano

nano exposes a native ClickHouse endpoint, so Tenzir can read stored events back with [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md) using a read-capable credential. Query the flattened `nanosiem.ocsf_logs` table, whose OCSF paths are dotted columns such as `src_endpoint.ip`:

```tql
let $hunt = "
  SELECT time, class_uid, `src_endpoint.ip`, message
  FROM nanosiem.ocsf_logs
  WHERE severity_id >= 3
  ORDER BY time DESC
"
from_clickhouse host="clickhouse", port=9000,
                user="nanosiem",
                password=secret("NANO_PASSWORD"),
                sql=$hunt
publish "nano-findings"
```

## See Also

* [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md)
* [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md)
* [Map to OCSF](../guides/normalize/map-to-ocsf.md)
* [ClickHouse](clickhouse.md)
