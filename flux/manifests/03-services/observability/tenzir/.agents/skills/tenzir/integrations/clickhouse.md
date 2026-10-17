---
title: "ClickHouse integration"
description: "Send structured events to ClickHouse tables."
canonical: https://tenzir.com/integrations/clickhouse
source: https://tenzir.com/integrations/clickhouse.md
section: "Integrations"
---

# ClickHouse integration

> Send structured events to ClickHouse tables.

[ClickHouse](https://clickhouse.com/clickhouse) stores and queries structured security telemetry. Use Tenzir to collect, parse, and normalize events before writing them with [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md). Read stored events back with [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md) for investigations, backfills, or export to another system.

You can let Tenzir create a table for each OCSF class, append to a schema you manage, or combine selected typed columns with a JSON catch-all. The choice determines how the table handles fields that vary between events.

ClickHouse integration

## Choose an integration path

Choose a write pattern based on how you want to manage the destination schema. You can use the read and export patterns with any of these tables.

| Goal                                                           | Pattern                                                                                                                                                                                        |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create tables from normalized OCSF events                      | [One table per OCSF class](clickhouse.md#create-a-table-per-ocsf-class)                                                                                        |
| Control column types, TTLs, projections, or materialized views | [Append to a table you manage](clickhouse.md#append-to-a-table-you-manage)                                                                                     |
| Keep common fields typed while accepting additional fields     | [Add a JSON catch-all to a table you manage](clickhouse.md#catch-all-columns)                                                                                  |
| Query retained events or feed detection pipelines              | [Read tables or SQL results](clickhouse.md#read-data-from-clickhouse) with [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md) |
| Check available tables and column types                        | [Inspect tables and schemas](clickhouse.md#inspect-tables-and-schemas)                                                                                         |
| Archive, migrate, or route stored events elsewhere             | [Export query results](clickhouse.md#export-query-results)                                                                                                     |

## Set up ClickHouse

Choose a managed ClickHouse Cloud service or a self-managed server. Both must be reachable from Tenzir through the native ClickHouse TCP protocol.

Start with ClickHouse Cloud

Use ClickHouse Cloud when you want ClickHouse managed separately from Tenzir but still reachable through the native protocol. Create a service with the [ClickHouse Cloud quick start](https://clickhouse.com/docs/getting-started/quick-start/cloud), copy the native endpoint, port, user, and database from the connection details, and keep TLS enabled.

Store the password in Tenzir’s secret store and pass the Cloud connection details to either ClickHouse operator:

```tql
from_clickhouse table="security.events",
                host="abc123.us-east-1.aws.clickhouse.cloud",
                port=9440,
                password=secret("CLICKHOUSE_PASSWORD")
```

If you need a local or self-managed ClickHouse deployment, start with the [ClickHouse OSS quick start](https://clickhouse.com/docs/getting-started/quick-start/oss). Tenzir connects to a self-managed server the same way, using the native host and port you configure in [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md) and [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md).

## Connect to ClickHouse

Tenzir uses the native ClickHouse TCP protocol. Use the native endpoint rather than the HTTP endpoint.

Use either a ClickHouse URI or explicit connection arguments:

```tql
from_clickhouse uri="clickhouse://default:secret@localhost:9000/security",
                table="events",
                tls=false
```

You can also pass the connection details as separate arguments:

```tql
from_clickhouse table="security.events",
                host="localhost",
                port=9000,
                user="default",
                password=secret("CLICKHOUSE_PASSWORD"),
                tls=false
```

Use the same connection arguments with [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md). If a URI selects a database and `table` is unqualified, Tenzir uses that database. In create modes, [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md) also creates the selected database if it doesn’t exist.

The write and read examples that follow assume a local server without TLS, so they use `tls=false`. For ClickHouse Cloud, use your service endpoint and credentials, and keep TLS enabled.

## Write events to ClickHouse

The following patterns differ in who defines the schema and where additional fields go. Use the one that matches your table layout.

### Create a table per OCSF class

Let Tenzir create tables when each OCSF class should have its own schema. The [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md) operator casts events to their OCSF class before [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md) creates the table.

```tql
from_file "ocsf_network_activity.json"
ocsf_cast
to_clickhouse table=f"ocsf.{class_name.replace(" ","_")}",
              primary=time, json=unmapped,
              tls=false
```

When creating a table, the [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md) operator uses the first event to determine the schema. Fields not mapped to JSON must have known types and must not be empty records. [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md) helps because it casts the fields of an event to their OCSF types before the table is created.

Leave out `null_fill=true` here. The nulls that it adds carry no type, so Tenzir cannot infer columns for them and table creation fails. If you want `null_fill=true`, [append to a table you manage](clickhouse.md#append-to-a-table-you-manage) instead.

The `json=unmapped` option creates the OCSF `unmapped` field as a ClickHouse `JSON` column, preserving its nested structure so you can query into its fields directly.

After the data lands, query it directly in ClickHouse:

```sql
SELECT
  dst_endpoint.ip,
  count() AS events,
  median(traffic.bytes_in) AS median_bytes_in
FROM ocsf.Network_Activity
WHERE time > now() - INTERVAL 1 DAY
GROUP BY dst_endpoint.ip
ORDER BY events DESC
LIMIT 20;
```

### Append to a table you manage

Create the ClickHouse table first when you need explicit types, table engines, TTL policies, projections, materialized views, or partitioning that should stay under ClickHouse control.

1. Create the table in ClickHouse:

   ```sql
   CREATE DATABASE IF NOT EXISTS security;


   CREATE TABLE security.alerts (
     time DateTime64(9),
     rule_name String,
     severity Int64,
     src_ip Nullable(IPv6),
     message String
   ) ENGINE = MergeTree()
   ORDER BY (time, rule_name);
   ```

2. Ingest data from Tenzir:

   ```tql
   from {
     time: 2026-06-01T12:00:00Z,
     rule_name: "failed-login-burst",
     severity: 5,
     src_ip: 10.0.1.12,
     message: "More than 20 failed logons from one source in 5 minutes",
   }
   to_clickhouse table="security.alerts", mode="append", tls=false
   ```

   The `mode="append"` setting makes the pipeline fail if the table does not exist, so ClickHouse remains the source of truth for the schema.

### Catch-all columns

Use a catch-all when events have a shared set of fields you want to query as typed columns, plus other fields that vary by source or OCSF class. You still create the table in ClickHouse. The difference is one writable, top-level `JSON` column marked with `COMMENT 'tenzir:catch_all'`, which receives fields that do not map to another column. The catch-all column’s name must not contain dots.

Choose typed columns for fields you filter, sort, or aggregate. Keep the rest in the catch-all until you need a dedicated column. This example uses a few common OCSF fields; adapt its columns, ordering key, and retention settings to your queries. Our tutorial on [building an OCSF lake with ClickHouse](../tutorials/build-an-ocsf-lake-with-clickhouse.md) explains these choices, measures their effect, and ends with a complete example table.

1. Create the table in ClickHouse:

   ```sql
   CREATE DATABASE IF NOT EXISTS security;


   CREATE TABLE security.events (
     time DateTime64(9),
     class_uid UInt32,
     class_name LowCardinality(String),
     severity_id UInt8,
     message Nullable(String),
     `src_endpoint.ip` Nullable(IPv4),
     unmapped JSON,
     event JSON COMMENT 'tenzir:catch_all'
   ) ENGINE = MergeTree ORDER BY (time, class_uid);
   ```

2. Send an event with [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md):

   ```tql
   from {
     time: 2026-09-07T10:00:00Z,
     class_uid: uint(4001),
     class_name: "Network Activity",
     severity_id: uint(1),
     src_endpoint: {ip: 10.0.1.12, port: uint(443)},
     unmapped: {source_field: "x"},
     sensor_name: "edge-01",
   }
   to_clickhouse table="security.events", mode="append", tls=false
   ```

The table determines where each field goes:

| Input                                            | Destination                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `time`, `class_uid`, `class_name`, `severity_id` | Their matching typed columns.                                                               |
| `src_endpoint.ip`                                | The column named `src_endpoint.ip`; dots in a column name select a nested input path.       |
| `unmapped`                                       | The ordinary JSON column, which stores `{"source_field":"x"}`.                              |
| `src_endpoint.port` and `sensor_name`            | The catch-all column, which stores `{"src_endpoint":{"port":443},"sensor_name":"edge-01"}`. |
| Missing `message`                                | The column’s default, which is `NULL` here.                                                 |

The catch-all column’s name does not select an input field. If the input itself contains a field named `event`, that field remains part of the catch-all JSON. Use `uint` values for unsigned integer columns and IP values for IP columns, as in the example. Fields without a matching column enter the catch-all without a warning; incompatible values for typed columns cause the event to be dropped with a warning. The [data handling rules](clickhouse.md#json-values-and-type-restrictions) cover the remaining conversions and restrictions.

#### Change which paths get typed columns

Add a column when you need to query a field that currently lives in the catch-all:

```sql
ALTER TABLE security.events ADD COLUMN `src_endpoint.port` UInt16;
```

After Tenzir refreshes the table description, new `src_endpoint.port` values go into that column. Other fields inside `src_endpoint` stay nested in the catch-all. Drop the column to route subsequent port values back to JSON:

```sql
ALTER TABLE security.events DROP COLUMN `src_endpoint.port`;
```

These changes affect new inserts. Adding a column does not backfill historical values from the catch-all. To make existing rows return them, declare the catch-all path as the column’s default:

```sql
ALTER TABLE security.events
  ADD COLUMN `src_endpoint.port` Nullable(UInt16)
  DEFAULT event.src_endpoint.port.:Int64;
```

ClickHouse then computes the value from the catch-all whenever it reads an older row, and `ALTER TABLE ... MATERIALIZE COLUMN` stores it. Use a `Nullable` column or wrap the path in `ifNull`, because reading a non-nullable column fails for rows without the path. When a column and the catch-all both hold a value, [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md) returns the column’s. Our tutorial on [building an OCSF lake with ClickHouse](../tutorials/build-an-ocsf-lake-with-clickhouse.md#evolve-the-table) walks through a complete promotion.

Dropping a column removes its stored typed values; Tenzir does not copy them back into historical JSON.

Each worker refreshes marked table descriptions every 30 seconds, checking for expired metadata before preparing a batch. Workers can briefly use different schema versions. For the refresh and retry limits, read the [schema-change behavior](clickhouse.md#schema-refresh-and-retries).

## Read data from ClickHouse

Use table mode when you want Tenzir to read a ClickHouse table as structured events. Tenzir pushes the `where`, `select`, and `head` operators that follow into the query it sends, so ClickHouse evaluates the filter and returns only the columns and rows the pipeline needs:

```tql
from_clickhouse table="ocsf.Network_Activity", tls=false
where severity_id >= 3 and status_id == 2
select time, src_endpoint, dst_endpoint, severity_id
publish "clickhouse-network-activity"
```

In table mode, a table with a catch-all column returns the events that [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md) wrote. The fields of the catch-all move back to the top level, dotted columns such as `src_endpoint.ip` become nested fields, and other `JSON` columns become records again:

```tql
from_clickhouse table="security.events", tls=false
where metadata.product.name == "Demo"
```

In such a table, only filters on columns without dots in their name go into the query. The [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md) reference describes the [reconstruction](../reference/operators/from_clickhouse.md#catch-all-tables) in detail.

Use SQL mode when ClickHouse should aggregate, sort, join, or otherwise shape the result in ways that `table` mode does not express. This query uses the catch-all table created earlier and selects its typed columns:

```tql
from_clickhouse sql="SELECT time, class_name, `src_endpoint.ip` AS src_ip FROM security.events WHERE severity_id >= 3 ORDER BY time DESC",
                tls=false
publish "clickhouse-findings"
```

### Preserve dotted JSON keys

Writes to a table with a catch-all enable ClickHouse’s `json_type_escape_dots_in_keys` setting, available from ClickHouse 25.8. Literal JSON keys such as `"a.b"` remain distinct from nested paths such as `a.b`, even when both occur in the same object. This also applies to ordinary JSON columns in the same table. Dotted physical column names still select nested input paths; a literal dotted input key stays in the catch-all.

The `table` form of [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md) enables the same setting when it reads a table with a catch-all. In `sql` mode, enable it in your query to restore literal dotted keys:

```tql
from_clickhouse sql="SELECT * FROM security.events SETTINGS json_type_escape_dots_in_keys=1",
                tls=false
```

Without this read setting, ClickHouse returns the escaped spelling `"a%2Eb"` for a stored literal `"a.b"` key. ClickHouse reads an original literal `%2E` sequence in a JSON key as a dot. Writes to tables without a catch-all keep their existing settings.

### Inspect tables and schemas

Use SQL mode for ClickHouse metadata queries:

```tql
from_clickhouse sql="SHOW TABLES FROM ocsf", tls=false
```

To inspect columns for a specific table, run `DESCRIBE TABLE`:

```tql
from_clickhouse sql="DESCRIBE TABLE ocsf.Network_Activity", tls=false
```

### Export query results

Because [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md) turns query results into regular Tenzir events, you can route them to any supported destination. For example, export a seven-day slice to S3 as Parquet:

```tql
from_clickhouse sql="SELECT * FROM ocsf.Network_Activity WHERE time >= now() - INTERVAL 7 DAY",
                tls=false
to_s3 "s3://security-exports/clickhouse/network_activity_{uuid}.parquet" {
  write_parquet
}
```

## Catch-all behavior and limits

A catch-all accepts additional fields without changing the table schema. It still follows ClickHouse’s type constraints and JSON storage behavior. Check these rules before using it for data that must retain its exact representation.

### JSON values and type restrictions

Ordinary JSON columns consume their matching input subtrees. For both those columns and the catch-all, Tenzir omits null object fields and null list elements recursively when serializing records. Empty records and lists remain. For example, `{items: [1, null, 2], absent: null}` becomes `{"items":[1,2]}`.

For strings mapped to ordinary JSON columns, the first non-whitespace character must be `{`. Those strings pass through unchanged, including nulls in the string. Other strings, such as `"[]"` or `"hello"`, become `{}` with a warning. Malformed object text can fail insertion at ClickHouse; it is not redirected to the catch-all. ClickHouse determines the stored native JSON representation, so these writes do not guarantee an exact structured round trip.

In `sql` mode, the [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md) operator returns native JSON as text. Parsing that text preserves the types of elements in mixed lists. In `table` mode, it parses the JSON of a catch-all table for you, inferring types like `parse_json` does.

Typed columns follow these rules:

* Missing columns use ClickHouse defaults. Explicit nulls remain null in nullable columns; an explicit null in a non-nullable typed column causes Tenzir to drop the event with a warning.
* In tables with a catch-all, `UInt8` accepts unsigned integers from 0 to 255. Tables without a catch-all retain the boolean-to-`UInt8` mapping.
* Durations map to `Int64` nanoseconds. Annotations such as `tenzir:type=duration(milliseconds)` are not supported.

### Table restrictions

The catch-all must use plain `JSON` without `DEFAULT`, `MATERIALIZED`, `ALIAS`, or `EPHEMERAL` expressions. Writable mapped columns cannot have overlapping paths such as `src` and `src.port`, use `Tuple` types, or use parameterized `JSON(...)` declarations. Column comments containing `tenzir:type=` annotations are not supported anywhere in a table with a catch-all.

Each worker validates a destination before its first write, including when the pipeline chooses table names dynamically.

### Schema refresh and retries

If ClickHouse rejects an insert because of a known schema mismatch, the affected worker reloads the table description. It retries pending input once if the description changed. Tenzir does not replay acknowledged inserts or retry ambiguous connection failures.

Removing an active catch-all marker is an error. Tables without a catch-all keep their cached mappings until the pipeline restarts.

## See also

* [Read from data stores](../guides/collect/read-from-data-stores.md)
* [Build an OCSF lake with ClickHouse](../tutorials/build-an-ocsf-lake-with-clickhouse.md)
* [Send to destinations](../guides/route/send-to-destinations.md)
* [Secrets](../explanations/secrets.md)
