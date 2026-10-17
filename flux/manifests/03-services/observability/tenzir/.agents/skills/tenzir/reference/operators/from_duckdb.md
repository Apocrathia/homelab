---
title: "from_duckdb"
canonical: https://tenzir.com/docs/reference/operators/from_duckdb
source: https://tenzir.com/docs/reference/operators/from_duckdb.md
section: "Docs"
---

# from_duckdb

> Reads events from a DuckDB database.

Reads events from a DuckDB database.

```tql
from_duckdb uri:string, [token=secret], [tls=bool|record],
            [table=string], [sql=string], [live=bool], [tracking_column=string]
```

## Description

The `from_duckdb` operator reads data from a [DuckDB](https://duckdb.org) database. Use a local file, an in-memory database, or a remote DuckDB server over Quack. Local databases run embedded inside Tenzir.

Our [DuckDB integration](../../integrations/duckdb.md#extensions) describes the bundled extensions available to local queries.

The operator supports two query modes:

1. **Table mode**: Read all rows from a table using the `table` parameter.
2. **SQL mode**: Execute a custom SQL query using the `sql` parameter.

Use exactly one of `table` or `sql`.

### `uri: string`

A local database path, an in-memory database name, or a Quack URI.

For a file path, the operator opens the file read-only, unless `live=true` is set. It never creates a missing file.

Use `":memory:"` for a private in-memory database that starts out empty. In combination with `sql`, this turns DuckDB’s file readers into a Tenzir source: anything DuckDB can query, including Parquet, CSV, JSON, and XLSX files, becomes a stream of events.

Use a named in-memory database, such as `":memory:alerts"`, to share data between pipelines in the same node. Pipelines using different names remain isolated. Named databases exist only while at least one operator holds them open. Once the last operator releases the database, its data disappears; reopening the same name creates an empty database. Separate nodes or CLI processes never share named in-memory databases.

Use `"quack:host[:port]"` to connect to a remote DuckDB server over [Quack](https://duckdb.org/docs/current/quack/overview). The alternative `"quack://host[:port]"` spelling is also accepted. The default port is `9494`; set the port explicitly for a TLS reverse proxy, such as `"quack:analytics.example.com:443"`. Set `token` for authentication and keep the table name in `table`, not in the URI.

### `token = secret (optional)`

The Quack server’s authentication token. Required for a `quack:` database and not accepted for local databases. Use `secret("duckdb-token")` to resolve it through Tenzir’s secret store. Do not put credentials in the URI.

### `tls = bool | record (optional)`

Controls TLS for Quack connections. Defaults to `false` for `localhost`, `127.0.0.1`, and `[::1]`, and `true` for other hosts. A record enables TLS and accepts `cacert` for a custom CA certificate file and `skip_peer_verification` to disable certificate verification. Verification is enabled by default. Node-wide TLS defaults apply.

The Quack client does not support client certificates, a minimum TLS version, or custom cipher lists. Unsupported TLS settings produce an error rather than being ignored. This option is not accepted for local databases.

### `table = string (optional)`

The name of the table to read from. Qualify the name with a schema as `schema.table`, or with a catalog and schema as `catalog.schema.table`, and double-quote components that contain special characters, such as `"my schema"."my table"`.

The resulting events carry the schema name `duckdb.<table>`.

### `sql = string (optional)`

A custom SQL query to execute. Tenzir sends the query as is and does not rewrite it, except for casting columns of types that TQL cannot represent (see [Types](from_duckdb.md#types)). The query must be a single statement; a trailing `;` is fine. Statements that modify the database, such as `INSERT`, `DELETE`, or `CREATE TABLE`, fail, including for named in-memory databases shared with other pipelines.

Use this mode for SQL features that `table` mode does not express, such as sorting, joins, aggregations, or reading files. For metadata queries, use SQL against DuckDB’s `information_schema` or `duckdb_*()` table functions.

For Quack databases, the query runs on the server: file paths, functions, macros, and metadata refer to the server, not to the Tenzir host. Remote queries must be a single `SELECT`, `SHOW`, or `DESCRIBE` statement. Other statements, including `EXPLAIN`, are not supported remotely.

The resulting events carry the schema name `duckdb.query`.

### `live = bool (optional)`

Enables continuous polling for new rows. The operator first emits every row in the table, then polls once per second for rows whose tracking column exceeds the largest value seen so far, and emits them in tracking order. The operator never finishes on its own.

Live mode assumes that rows commit in tracking order. A row that commits after a row with a larger tracking value was already emitted is skipped, for example when two writers pick keys concurrently and the larger one commits first.

For local databases, live mode opens the database for writing so that it can share the database with [`to_duckdb`](https://tenzir.com/docs/reference/operators/to_duckdb.md) operators in the same node and see what they append. For Quack databases, it polls the server. See [Concurrency](from_duckdb.md#concurrency) for the local-file restrictions.

Requires `table`. Defaults to `false`.

### `tracking_column = string (optional)`

The integer column whose growth marks new rows in live mode, including `HUGEINT`, `UHUGEINT`, and `BIGNUM` columns. Use a column that only ever increases, such as an auto-incrementing key or a sequence number.

When omitted, the operator uses the table’s single-column integer primary key, and fails if there is none. Other integer columns need not increase, so the operator never picks them on its own.

The column name is case-insensitive, like all identifiers in DuckDB.

Requires `live=true`.

## Types

The operator maps DuckDB types to [Type System](../types.md) as follows:

| DuckDB Type                                                | Tenzir Type | Notes                               |
| ---------------------------------------------------------- | ----------- | ----------------------------------- |
| `BOOLEAN`                                                  | `bool`      |                                     |
| `TINYINT`, `SMALLINT`, `INTEGER`, `BIGINT`                 | `int64`     |                                     |
| `UTINYINT`, `USMALLINT`, `UINTEGER`, `UBIGINT`             | `uint64`    |                                     |
| `FLOAT`, `DOUBLE`                                          | `double`    |                                     |
| `VARCHAR`                                                  | `string`    |                                     |
| `BLOB`                                                     | `blob`      |                                     |
| `TIMESTAMP`, `TIMESTAMP_S`, `TIMESTAMP_MS`, `TIMESTAMP_NS` | `time`      |                                     |
| `TIMESTAMP WITH TIME ZONE`                                 | `time`      |                                     |
| `DATE`                                                     | `time`      | Midnight of that day                |
| `INTERVAL`                                                 | `duration`  | Intervals with months become `null` |
| `LIST`, `ARRAY`                                            | `list`      |                                     |
| `STRUCT`                                                   | `record`    |                                     |
| `MAP`                                                      | `list`      | A list of `{key, value}` records    |
| `NULL`                                                     | `null`      |                                     |
| Everything else                                            | `string`    | Cast by DuckDB, see below           |

DuckDB types without a TQL counterpart, such as `DECIMAL`, `HUGEINT`, `UUID`, `TIME`, `ENUM`, `BIT`, and `UNION`, arrive as strings in DuckDB’s own textual representation. This also applies to such types nested inside lists and structs. The operator emits a warning for every affected column.

A `time` covers the years 1678 to 2261 with nanosecond precision. Timestamps and dates outside that range, `infinity` and `-infinity`, and intervals with a month component, whose length depends on the calendar, become `null`. The operator emits a warning for every affected column.

## Optimizations

When the operator reads a table, it lets DuckDB do the work of the [`where`](https://tenzir.com/docs/reference/operators/where.md), [`select`](https://tenzir.com/docs/reference/operators/select.md), [`head`](https://tenzir.com/docs/reference/operators/head.md), and [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) operators that follow it, so that DuckDB returns only the rows, columns, and summaries that the pipeline needs. The page on [DuckDB optimizations](../optimizations/duckdb.md) describes which filters DuckDB evaluates, and the [optimizations overview](../optimizations.md) explains how Tenzir optimizes pipelines in general.

## Remote databases

Each operator keeps its credentials and TLS settings isolated from other operators. Local-file locking rules do not apply to remote connections.

Quack is a beta protocol. Our [DuckDB integration](../../integrations/duckdb.md#quack) describes the tested client and server versions.

## Concurrency

DuckDB enforces one rule for database files: a process opens a file either for reading or for writing. Within a Tenzir node, this has two consequences:

* `from_duckdb` without `live` opens the file read-only, unless another pipeline already has it open for writing, in which case it shares that database and still only reads. While it reads, a [`to_duckdb`](https://tenzir.com/docs/reference/operators/to_duckdb.md) or a live `from_duckdb` on the same file cannot start.
* `from_duckdb` with `live=true` opens the file for writing. It shares the database with every [`to_duckdb`](https://tenzir.com/docs/reference/operators/to_duckdb.md) and every other reader of the same file and sees what the writers append.

Across processes, a file that any process has open for writing cannot be opened by another process at all. Read-only processes can share a file.

## Examples

### Read all rows from a table

```tql
from_duckdb "events.duckdb", table="alerts"
```

### Read from a remote server

```tql
from_duckdb "quack:analytics.example.com:443",
  token=secret("duckdb-token"), table="alerts"
```

To query a file on that server:

```tql
from_duckdb "quack:analytics.example.com:443",
  token=secret("duckdb-token"),
  sql="SELECT * FROM read_parquet('/data/alerts.parquet')"
```

### Read a table in a schema

```tql
from_duckdb "events.duckdb", table="staging.alerts"
```

### Run a custom SQL query

```tql
from_duckdb "events.duckdb",
  sql="SELECT src_ip, count(*) AS n FROM flows GROUP BY src_ip ORDER BY n DESC"
```

### Query Parquet files with DuckDB

```tql
from_duckdb ":memory:",
  sql="SELECT * FROM 'flows/*.parquet' WHERE bytes > 1000000"
```

### Read a shared in-memory table

Start a writing pipeline in the same node first and wait until it has created the table. Keep at least one pipeline using the named database running:

```tql
from_duckdb ":memory:alerts", table="alerts", live=true
```

### List the tables in a database

```tql
from_duckdb "events.duckdb",
  sql="SELECT table_schema, table_name FROM information_schema.tables"
```

### Read only the columns a pipeline uses

The `select` reaches the query, so DuckDB decodes only `id` and `message`:

```tql
from_duckdb "events.duckdb", table="alerts"
select id, message
```

### Filter rows in DuckDB

The `where` and `head` reach the query, so DuckDB returns at most 10 matching rows:

```tql
from_duckdb "events.duckdb", table="alerts"
where severity >= 3
head 10
```

### Summarize rows in DuckDB

The `where` and the `summarize` reach the query, so DuckDB returns one row per source address:

```tql
from_duckdb "events.duckdb", table="alerts"
where severity >= 3
summarize src_ip, alerts=count(), first=min(ts)
```

### Stream new rows from a table

```tql
from_duckdb "events.duckdb", table="alerts", live=true
```

### Stream with an explicit tracking column

```tql
from_duckdb "events.duckdb", table="alerts", live=true, tracking_column="seq"
```

## See Also

* [Read from data stores](../../guides/collect/read-from-data-stores.md)
* [`to_duckdb`](https://tenzir.com/docs/reference/operators/to_duckdb.md)
* [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md)
* [`from_mysql`](https://tenzir.com/docs/reference/operators/from_mysql.md)
* [DuckDB](../../integrations/duckdb.md)
