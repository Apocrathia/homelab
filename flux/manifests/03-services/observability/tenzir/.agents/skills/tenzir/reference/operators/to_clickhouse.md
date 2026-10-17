---
title: "to_clickhouse"
canonical: https://tenzir.com/docs/reference/operators/to_clickhouse
source: https://tenzir.com/docs/reference/operators/to_clickhouse.md
section: "Docs"
---

# to_clickhouse

> Sends events to a ClickHouse table.

Sends events to a ClickHouse table.

```tql
to_clickhouse [table=string,
               uri=string, host=string, port=int, user=string, password=string,
               mode=string, primary=field, json=field|[field], low_cardinality=field|[field],
               max_batch_rows=int, batch_timeout=duration,
               tls=bool|record]
```

## Catch-all columns

In an existing table, mark one writable, top-level `JSON` column with `COMMENT 'tenzir:catch_all'` to collect fields that do not map to other columns. The catch-all column must use plain `JSON` without a default expression, and its name must not contain dots.

Our [ClickHouse integration guide](../../integrations/clickhouse.md#catch-all-columns) covers table setup, OCSF examples, type and JSON behavior, restrictions, and schema changes.

## Description

### `table = string`

The name of the table you want to write to.

This can be a dynamic expression, allowing you to automatically write to different tables based on the data.

The `<database>.<table>` notation can be used to also specify a table. If no `<database>` is provided, Tenzir writes to the database selected by the URI, if any, or the server default.

### `uri = string (optional)`

A ClickHouse connection URI in the format:

```text
clickhouse://[user[:password]@]host[:port][/database]
```

When present, the URI supplies the connection endpoint and optionally the current database.

If the URI includes `/database` and `table` is unqualified, Tenzir writes to that database. In `mode="create"` and `mode="create_append"`, Tenzir also creates the selected database if it does not exist yet.

Use `tls` separately to control TLS.

### `host = string (optional)`

The hostname for the ClickHouse server.

Defaults to `"localhost"`.

Mutually exclusive with `uri`.

### `port = int (optional)`

The port for the ClickHouse server.

Defaults to `9000` without TLS and `9440` with TLS.

Mutually exclusive with `uri`.

### `user = string (optional)`

The user to use for authentication.

Defaults to `"default"`.

Mutually exclusive with `uri`.

### `password = string (optional)`

The password for the given user.

Defaults to `""`.

Mutually exclusive with `uri`.

### `mode = string (optional)`

* `"create"` Create a table and database. Fails if the table already exists.
* `"append"` Appends to an existing table. Fails if the table or database do not exist.
* `"create_append"` Creates a table and database if they do not exist. Appends if the table already exists.

Defaults to `"create_append"`.

### `primary = field (optional)`

The primary key to use when creating a table. Required for `mode = "create"` as well as for `mode = "create_append"` if the table does not yet exist.

### `json = field|[field] (optional)`

When using `mode = "create"` or `mode = "create_append"`, the operator creates the listed fields as the ClickHouse `JSON` type instead of inferring them from the first event. A listed top-level field is created as a `JSON` column even when the event omits it. Nested fields must be present in the first event. Because `json` only affects table creation, combining it with `mode = "append"` is an error.

A listed field can be a top-level field or a nested field reached through records. This is useful when sending heterogeneous data, such as for OCSF `unmapped` or a nested, dynamically-shaped sub-object like `file.xattributes`:

```tql
to_clickhouse table="events", primary=id, json=file.xattributes
```

### `low_cardinality = field|[field] (optional)`

When using `mode = "create"` or `mode = "create_append"`, the operator creates the string columns listed in `low_cardinality` with dictionary encoding. This reduces storage for columns with few distinct values. Non-primary columns use `LowCardinality(Nullable(String))`; primary columns use `LowCardinality(String)`.

Unlike `json`, the inner type is inferred from the data, so every listed field must be present in the first event that creates the table; otherwise the operator raises an error. `low_cardinality` is only supported for `string` columns. Because it only affects table creation, combining it with `mode = "append"` is an error.

Like `json`, a listed field can be a top-level field or a nested field reached through records.

### `max_batch_rows = int (optional)`

The operator accumulates incoming events per target table and flushes its buffer when it reaches this many rows or `batch_timeout` elapses. It also flushes remaining events when the pipeline finishes or checkpoints. Batching combines small groups of events into larger inserts.

Defaults to `8192`.

### `batch_timeout = duration (optional)`

The time after which the operator flushes a table’s buffered events, even if the buffer has not reached `max_batch_rows`. Queued writes and backpressure can delay insertion beyond this timeout.

Defaults to `1s`.

### `tls = record (optional)`

TLS configuration. Provide an empty record (`tls={}`) to enable TLS with defaults or set fields to customize it.

```tql
{
  skip_peer_verification: bool, // skip certificate verification.
  cacert: string,               // CA bundle to verify peers.
  certfile: string,             // client certificate to present.
  keyfile: string,              // private key for the client certificate.
  min_version: string,          // minimum TLS version (`"1.0"`, `"1.1"`, `"1.2"`, "1.3"`).
  ciphers: string,              // OpenSSL cipher list string.
  client_ca: string,            // CA to validate client certificates.
  require_client_cert: bool,    // require clients to present a certificate.
}
```

The `client_ca` and `require_client_cert` options are only valid for operators that accept incoming client connections.

Any value not specified in the record will either be picked up from the configuration or if not configured will not be used by the operator.

See the [Node TLS Setup guide](../../guides/node-setup/configure-tls.md) for more details.

## Types

This section describes automatic table creation and insertion into unmarked tables. Our ClickHouse integration guide describes the [type and JSON behavior of catch-all tables](../../integrations/clickhouse.md#json-values-and-type-restrictions).

Tenzir uses ClickHouse’s [clickhouse-cpp](https://github.com/ClickHouse/clickhouse-cpp) client library to communicate with ClickHouse. The below table explains the translation from Tenzir’s types to ClickHouse:

| Tenzir     | ClickHouse                     | Comment                                                                                           |
| ---------- | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `bool`     | `Bool`                         |                                                                                                   |
| `string`   | `String`                       |                                                                                                   |
| `int64`    | `Int64`                        |                                                                                                   |
| `uint64`   | `UInt64`                       |                                                                                                   |
| `double`   | `Float64`                      |                                                                                                   |
| `ip`       | `IPv6`                         |                                                                                                   |
| `subnet`   | `Tuple(ip IPv6, length UInt8)` |                                                                                                   |
| `time`     | `DateTime64(9)`                |                                                                                                   |
| `duration` | `Int64`                        | Converted as `nanoseconds(duration)`                                                              |
| `record`   | `Tuple(...)`                   | Fields in the tuple will be named with the field name. The record must have at least one element. |
| `list<T>`  | `Array(T)`                     |                                                                                                   |
| `blob`     | `Array(UInt8)`                 | Blobs that are `null` will be represented by an empty array                                       |

### Nullable

Tenzir also supports `Nullable` versions of the above types (or their nested types). If a `list` itself is `null`, it will be represented by an empty `Array`. If a `record` is `null`, all elements of the `Tuple` will be null, if possible. Otherwise the event will be dropped.

### Clickhouse JSON

[`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md) can write to a ClickHouse `JSON` column for columns that already have this type in the table. By default, [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md) will not create JSON columns on its own. Use the explicit `json` option or create the table on the server ahead of time.

A `record` maps to a JSON object. A `string` is also accepted and written verbatim if its first non-whitespace character is `{`; ClickHouse validates the JSON. A value that is neither a record nor a JSON-object string is written as an empty object (`{}`) with a warning, because ClickHouse `JSON` columns only accept objects at the top level.

### Appending to existing columns

When appending to existing tables, the operator supports `UInt16`, `UInt32`, `Int8`, `Int16`, `Int32`, and `Float32` columns in addition to the types it creates automatically. Values must fit the destination’s range and precision. Incompatible values for these typed columns produce a warning and drop the affected event, including in tables with a catch-all. In tables without a catch-all column, `UInt8` retains the legacy boolean mapping: `false` becomes `0` and `true` becomes `1`.

The operator also writes to:

* `LowCardinality(String)` and `LowCardinality(Nullable(String))` columns by sending string values.
* `DateTime64(N)` and `DateTime64(N, 'tz')` columns with precision `N` from 0 to 9 and an optional timezone. Tenzir rounds `time` values down to the column’s precision. Tenzir creates `time` columns as `DateTime64(9)`, but you can append to a coarser column such as `DateTime64(3, 'UTC')`.

Both also apply within nested `Tuple` and `Array` columns and in their `Nullable` forms, such as `LowCardinality(Nullable(String))`.

An existing table may contain writable columns with unsupported types, such as `Enum`. If such a column has a `DEFAULT` expression, the operator can omit it and let ClickHouse fill in the default. Providing a value for that column causes the event to be dropped with a warning. An unsupported writable column without a default raises an error.

ClickHouse computes `MATERIALIZED` and `ALIAS` columns. In tables without a catch-all, Tenzir ignores supplied values for these columns with a warning. In tables with a catch-all, input matching `MATERIALIZED`, `ALIAS`, or `EPHEMERAL` columns remains in the catch-all.

### Batching

The operator buffers events per destination table and writes them in inserts, regardless of their schema. The `max_batch_rows` and `batch_timeout` options control when buffers are flushed.

### Table Creation

When Tenzir creates a ClickHouse table, scalar columns other than the primary key are nullable. Arrays and tuples have nullable elements or fields rather than a nullable container. JSON columns use plain `JSON`. For example, an `ip` field becomes `Nullable(IPv6)`, while a `list<int64>` becomes `Array(Nullable(Int64))`.

The operator infers the table’s columns from the first events it receives. Should these events contain unsupported types or values, an error is raised. The same applies to a field that holds values of different types across these events, because a ClickHouse column has a single type.

#### Null-only columns

A `null` value does not carry a type. If a field is `null` in all of the first events, the operator cannot infer a ClickHouse column type for it, and table creation fails. Fields selected as JSON with `json=` are an exception.

To avoid the error, make sure that the first events have a value for every field, select the field with `json=`, or create the table ahead of time and use `mode="append"`.

#### Empty records

An empty record cannot define a ClickHouse `Tuple` column. It causes an error during table creation unless the field is selected as JSON. Empty records are valid inside JSON columns, including the catch-all.

## Examples

### Append a CSV file to an existing local table

Create `my_table` with columns matching the CSV fields before running:

```tql
from_file "my_file.csv"
to_clickhouse table="my_table", mode="append", tls=false
```

### Use a connection URI

```tql
from_file "my_file.csv"
to_clickhouse uri="clickhouse://default:secret@clickhouse.example.com:9000/security",
              table="alerts",
              primary=time,
              tls=false
```

This writes to `security.alerts`.

### Send OCSF data to ClickHouse

Use [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md) to cast events to their OCSF class. Free-form fields and differences in OCSF classes, versions, profiles, or extensions can still produce different schemas.

```tql
subscribe "ocsf"
ocsf_cast
to_clickhouse table=f"ocsf.{class_name.replace(" ","_")}", primary=time,
              json=unmapped
```

The `json=unmapped` option creates the free-form `unmapped` field as a `JSON` column, even when the first event omits it. List every free-form field that your OCSF classes contain in `json`. A nested field such as `file.xattributes` must be present in the first event.

Leave out `null_fill=true` when Tenzir creates the table. The nulls that it adds carry no type, so the operator cannot infer columns for them and table creation fails. To use `null_fill=true`, create the table ahead of time and write with `mode="append"`.

Alternatively, for a single high-volume landing table, serialize each event to a JSON string and write it into one `JSON` column. All events then share one schema and [batch](to_clickhouse.md#batching) into large inserts:

```tql
subscribe "ocsf"
this = { event: this.print_json(), source_type: class_name }
to_clickhouse table="ocsf_logs", mode="append"
```

Here `ocsf_logs` is pre-created on the server with an `event JSON` column, so `mode = "append"` writes the serialized events straight in.

### Create a new table with multiple fields

```tql
from { i: 42, d: 10.0, b: true, l: [42], r:{ s:"string" } }
to_clickhouse table="example", primary=i
```

This creates the following table:

```plaintext
   ┌─name─┬─type────────────────────┐
1. │ i    │ Int64                   │
2. │ d    │ Nullable(Float64)       │
3. │ b    │ Nullable(Bool)          │
4. │ l    │ Array(Nullable(Int64))  │
5. │ r    │ Tuple(                 ↴│
   │      │↳    s Nullable(String)) │
   └──────┴─────────────────────────┘
```

## See Also

* [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md)
* [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md)
* [Send to destinations](../../guides/route/send-to-destinations.md)
* [ClickHouse](../../integrations/clickhouse.md)
* [nano](../../integrations/nano.md)
