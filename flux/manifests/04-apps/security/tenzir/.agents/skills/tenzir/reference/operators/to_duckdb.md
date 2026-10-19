---
title: "to_duckdb"
canonical: https://tenzir.com/docs/reference/operators/to_duckdb
source: https://tenzir.com/docs/reference/operators/to_duckdb.md
section: "Docs"
---

# to_duckdb

> Writes events to a DuckDB table.

Writes events to a DuckDB table.

```tql
to_duckdb uri:string, table=string, [token=secret], [tls=bool|record],
          [mode=string], [primary=field], [checkpoint_interval=duration]
```

## Description

The `to_duckdb` operator appends events to a table in a [DuckDB](https://duckdb.org) database. Use a local file, an in-memory database, or a remote DuckDB server over Quack. For local files, DuckDB runs embedded inside Tenzir and creates the file if it does not exist.

By default, the operator creates the table from the first batch of events it receives, deriving one column per top-level field. Subsequent events that do not fit that table never stop the pipeline:

* Fields without a column are dropped.
* Values of a type that the column does not accept become `NULL`.
* Numbers outside the range of their column become `NULL`, and so do strings that are no valid `UUID` or member of an `ENUM`.
* An event without a field for a column gets the column’s `DEFAULT` value, or `NULL`, regardless of the other events. A field that holds `null` writes `NULL`.

The operator emits a warning the first time each of these happens for a field. To keep all data, filter and reshape heterogeneous streams with [`where`](https://tenzir.com/docs/reference/operators/where.md), [`select`](https://tenzir.com/docs/reference/operators/select.md), or [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md) before writing them, or write each event kind to its own table.

### `uri: string`

A local database path, an in-memory database name, or a Quack URI. For a file path, the operator creates the file if it does not exist.

Use `":memory:"` for a private in-memory database that vanishes when the pipeline ends.

Use a named in-memory database, such as `":memory:alerts"`, to share data between pipelines in the same node. Pipelines using different names remain isolated. Named databases exist only while at least one operator holds them open. Once the last operator releases the database, its data disappears; reopening the same name creates an empty database. Separate nodes or CLI processes never share named in-memory databases.

Use `"quack:host[:port]"` to connect to a remote DuckDB server over [Quack](https://duckdb.org/docs/current/quack/overview). The alternative `"quack://host[:port]"` spelling is also accepted. The default port is `9494`; set the port explicitly for a TLS reverse proxy, such as `"quack:analytics.example.com:443"`. Set `token` for authentication and keep the table name in `table`, not in the URI.

### `token = secret (optional)`

The Quack server’s authentication token. Required for a `quack:` database and not accepted for local databases. Use `secret("duckdb-token")` to resolve it through Tenzir’s secret store. Do not put credentials in the URI.

### `tls = bool | record (optional)`

Controls TLS for Quack connections. Defaults to `false` for `localhost`, `127.0.0.1`, and `[::1]`, and `true` for other hosts. A record enables TLS and accepts `cacert` for a custom CA certificate file and `skip_peer_verification` to disable certificate verification. Verification is enabled by default. Node-wide TLS defaults apply.

The Quack client does not support client certificates, a minimum TLS version, or custom cipher lists. Unsupported TLS settings produce an error rather than being ignored. This option is not accepted for local databases.

### `table = string`

The name of the table to write to. Qualify the name with a schema as `schema.table`, or with a catalog and schema as `catalog.schema.table`, and double-quote components that contain special characters, such as `"my schema"."my table"`. When creating a table, the operator also creates a missing schema.

Quack destinations accept `table` or `schema.table`, but not a catalog-qualified name. The server’s current database determines the destination catalog.

### `mode = string (optional)`

* `"create"`: Creates the table. Fails if it already exists.
* `"append"`: Appends to an existing table. Fails if it does not exist, and never creates a missing database file.
* `"create_append"`: Creates the table if it does not exist, and appends otherwise. Appending to an existing table works like `"append"`, so the first batch need not carry every column.

Defaults to `"create_append"`.

### `primary = field (optional)`

A top-level field to declare as the table’s `PRIMARY KEY` when creating the table. DuckDB rejects events that repeat a key with an error.

### `checkpoint_interval = duration (optional)`

How often the operator asks DuckDB to checkpoint, that is, to move committed data from the write-ahead log into the database file. Every batch of events is committed as soon as it is written and is immediately visible to readers in the same node; a checkpoint additionally bounds the size of the write-ahead log and what a crash could roll back. The operator also checkpoints once when the pipeline ends.

Must be at least `1s` for local databases. Defaults to `10s`.

Ignored for Quack destinations. The server controls checkpoints; Tenzir does not schedule them or request a checkpoint when a remote writer finishes.

## Types

The operator maps [Type System](../types.md) to DuckDB types as follows:

| Tenzir Type | DuckDB Type    | Notes                                   |
| ----------- | -------------- | --------------------------------------- |
| `bool`      | `BOOLEAN`      |                                         |
| `int64`     | `BIGINT`       |                                         |
| `uint64`    | `UBIGINT`      |                                         |
| `double`    | `DOUBLE`       |                                         |
| `string`    | `VARCHAR`      |                                         |
| `blob`      | `BLOB`         |                                         |
| `time`      | `TIMESTAMP_NS` |                                         |
| `duration`  | `INTERVAL`     | Rounded to microseconds, with a warning |
| `ip`        | `VARCHAR`      | Textual representation                  |
| `subnet`    | `VARCHAR`      | Textual representation                  |
| `list`      | `LIST`         | Element type derived from the elements  |
| `record`    | `STRUCT`       | One member per field                    |

A field whose values carry no type information, because they are all `null`, empty lists, or lists of `null`, gets no column, and the operator emits a warning. Rather than guessing a type that later events might contradict, the operator leaves the column out. When no field of the first batch carries type information, the operator drops the batch with a warning and creates the table from the next one. A field that holds values of more than one type across the events of one batch gets the type of the majority of its values. Values of the other types are written as well if the column accepts them, such as `int64` values in a `DOUBLE` column, and become `NULL` otherwise.

When appending to an existing table, the operator also accepts:

* `int64` and `uint64` fields for any integer, floating-point, `HUGEINT`, `UHUGEINT`, or `DECIMAL` column,
* `double` fields for `FLOAT`, `DOUBLE`, and `DECIMAL` columns,
* `string` fields for `UUID` and `ENUM` columns, and
* `time` fields for any `TIMESTAMP` precision. Columns coarser than nanoseconds truncate the times toward the past, with a warning.

These conversions work like DuckDB’s `TRY_CAST`, also inside lists and records: numbers round half away from zero to the scale of a `DECIMAL`, and `UUID` columns accept the usual 36-character form as well as variants in braces or without hyphens. Generated columns accept no values, so the operator drops fields that match one.

For local databases, a batch is written completely or not at all. DuckDB rejects constraint violations, such as a duplicate primary key or a `null` in a `NOT NULL` column, and the operator fails with an error. Remote writes have the limitations described in [Remote databases](to_duckdb.md#remote-databases).

## Remote databases

Each operator keeps its credentials and TLS settings isolated from other operators. Local-file locking rules do not apply to remote connections.

Quack is a beta protocol. Our [DuckDB integration](../../integrations/duckdb.md#quack) describes the bundled extensions and tested client and server versions.

The tested Quack version cannot attach databases containing sequence-backed column defaults. This prevents `to_duckdb` from connecting, even when writing to another table in that database. Remote reads do not have this limitation.

Remote writes are not atomic

The tested Quack version does not reliably roll back writes. An error or interrupted connection can leave some rows written, even if the operator reports failure. Tenzir does not retry failed writes automatically; rerunning a pipeline can duplicate rows. Do not rely on local batch-atomicity guarantees for remote destinations.

## Concurrency

Several pipelines in the same node can write to the same database file at the same time, even to the same table: DuckDB’s transactions keep appends from conflicting.

DuckDB enforces one rule for database files: a process opens a file either for reading or for writing. While a `to_duckdb` runs, every [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md) in the same node shares its database and can read the file, but no other process can open the file at all. Stop the writing pipelines before opening the file with the `duckdb` CLI or another tool.

Conversely, `to_duckdb` cannot open a file that a [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md) without `live=true` in the same node still reads, because that reader opened it read-only.

## Examples

### Write events to a table

```tql
subscribe "alerts"
to_duckdb "events.duckdb", table="alerts"
```

### Write to a remote server

```tql
subscribe "alerts"
to_duckdb "quack:analytics.example.com:443",
  token=secret("duckdb-token"), table="alerts"
```

For a server with a private CA:

```tql
subscribe "alerts"
to_duckdb "quack:analytics.example.com:443",
  token=secret("duckdb-token"), tls={cacert: "/etc/tenzir/duckdb-ca.pem"},
  table="staging.alerts"
```

### Share an in-memory database

A running writer keeps a named database available to other pipelines in the same node. The table becomes available after the first batch is written:

```tql
subscribe "alerts"
to_duckdb ":memory:alerts", table="alerts", primary=id
```

Another pipeline can read the table with [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md) while this writer runs.

### Create a table with a primary key

```tql
from_file "users.json" { read_ndjson }
to_duckdb "identity.duckdb", table="users", primary=user_id, mode="create"
```

### Append to an existing table

```tql
from_file "more-users.json" { read_ndjson }
to_duckdb "identity.duckdb", table="users", mode="append"
```

### Write into a schema

```tql
subscribe "alerts"
to_duckdb "events.duckdb", table="staging.alerts"
```

### Write OCSF events to one table per class

```tql
subscribe "ocsf"
ocsf_cast
where class_uid == 4001
to_duckdb "ocsf.duckdb", table="network_activity", checkpoint_interval=1min
```

## See Also

* [Send to destinations](../../guides/route/send-to-destinations.md)
* [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md)
* [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md)
* [DuckDB](../../integrations/duckdb.md)
