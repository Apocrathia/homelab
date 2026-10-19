---
title: "DuckDB integration"
description: "Read from and write to DuckDB database files with an embedded DuckDB engine."
canonical: https://tenzir.com/integrations/duckdb
source: https://tenzir.com/integrations/duckdb.md
section: "Integrations"
---

# DuckDB integration

> Read from and write to DuckDB database files with an embedded DuckDB engine.

This page shows you how to use DuckDB as an embedded analytical store for Tenzir pipelines: write security telemetry to DuckDB tables with [`to_duckdb`](https://tenzir.com/docs/reference/operators/to_duckdb.md), and read tables, SQL query results, or files that DuckDB can parse back into Tenzir with [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md).

[DuckDB](https://duckdb.org) is an open-source analytical database that runs inside the application that uses it. Tenzir embeds DuckDB, so there is no server to deploy and no network protocol in between: a pipeline opens a database file directly, and the same file is later available to the `duckdb` CLI, Python, R, or any other DuckDB client for analysis.

## Choose an integration path

Use the path that matches the role DuckDB plays in your deployment:

| Goal                                               | DuckDB role                                            | Tenzir building blocks                                                                                                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep a local, queryable copy of telemetry          | Destination database file on the node                  | [`to_duckdb`](https://tenzir.com/docs/reference/operators/to_duckdb.md)                                                                                                                                           |
| Store OCSF events per class                        | One table per event class                              | [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md), [`where`](https://tenzir.com/docs/reference/operators/where.md), [`to_duckdb`](https://tenzir.com/docs/reference/operators/to_duckdb.md) |
| Query retained telemetry                           | Source table or SQL query result                       | [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md)                                                                                                                                       |
| Read Parquet, CSV, JSON, or XLSX files through SQL | In-memory query engine over files                      | [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md) with `":memory:"` and `sql=...`                                                                                                       |
| React to rows other pipelines write                | Shared database file within a node                     | [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md) with `live=true`                                                                                                                      |
| Inspect available tables and schemas               | `information_schema` and `duckdb_*()` metadata queries | [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md) with `sql=...`                                                                                                                        |

## Write events

Write a stream of events into a table. The operator creates the database file and the table from the first events it receives:

```tql
subscribe "alerts"
to_duckdb "/var/lib/tenzir/alerts.duckdb", table="alerts", primary=id
```

A DuckDB table has a fixed set of typed columns. Fields without a column are dropped and values that do not fit their column become `NULL`, each with a warning. To keep all data, shape heterogeneous streams before writing them, or write each event kind to its own table:

```tql
subscribe "ocsf"
ocsf_cast
where class_uid == 4001
to_duckdb "/var/lib/tenzir/ocsf.duckdb", table="network_activity"
```

Several pipelines can write to the same database file at the same time. Every batch of events is committed, and thereby durable, as soon as it is written. Checkpoints, whose frequency `checkpoint_interval` controls, periodically move the committed data from DuckDB’s write-ahead log into the database file.

## Read events

Read a whole table:

```tql
from_duckdb "/var/lib/tenzir/alerts.duckdb", table="alerts"
```

Or let DuckDB do the heavy lifting with SQL:

```tql
from_duckdb "/var/lib/tenzir/alerts.duckdb",
  sql="SELECT src_ip, count(*) AS n FROM alerts GROUP BY src_ip ORDER BY n DESC LIMIT 10"
```

An in-memory database needs no file and turns DuckDB’s readers into a Tenzir source:

```tql
from_duckdb ":memory:", sql="SELECT * FROM 'flows/*.parquet' WHERE bytes > 1000000"
```

## Stream new rows

With `live=true`, [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md) keeps running and emits rows that other pipelines in the same node append, tracked through an increasing integer column:

```tql
from_duckdb "/var/lib/tenzir/alerts.duckdb", table="alerts", live=true
publish "new-alerts"
```

## Understand file access

DuckDB opens a database file either for reading or for writing, and a file that one process has open for writing is locked for every other process. Within a Tenzir node:

* Any number of [`to_duckdb`](https://tenzir.com/docs/reference/operators/to_duckdb.md) operators share one file, and appends never conflict.
* [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md) reads a file that writers have open by sharing their database. Started first, it opens the file read-only, and writers for that file cannot start until it finishes.
* [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md) with `live=true` always opens the file for writing, so that writers can join it and it sees their appends.

To analyze a file with the `duckdb` CLI, stop the pipelines that write to it first; they checkpoint when they end, so the file then holds all data. Do not copy a file while pipelines write to it: recent rows may still live in the separate write-ahead log, and the copy can race a checkpoint. To look at the data while writers run, query it with [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md) inside the node, which shares the writers’ database.

## Extensions

| Extension                                                                    | Capability                                   | Dynamic builds | Static builds |
| ---------------------------------------------------------------------------- | -------------------------------------------- | -------------- | ------------- |
| [`core_functions`](https://tenzir.com/integrations/duckdb.md#core-functions) | Scalar SQL functions                         | Yes            | Yes           |
| [`excel`](https://tenzir.com/integrations/duckdb.md#excel)                   | XLSX workbook reader                         | Yes            | Yes           |
| [`httpfs`](https://tenzir.com/integrations/duckdb.md#http-filesystem)        | HTTP(S) and S3 file access                   | Yes            | Yes           |
| [`icu`](https://tenzir.com/integrations/duckdb.md#icu)                       | Time zones and locale-aware collations       | Yes            | No            |
| [`json`](https://tenzir.com/integrations/duckdb.md#json)                     | JSON readers and SQL functions               | Yes            | Yes           |
| [`parquet`](https://tenzir.com/integrations/duckdb.md#parquet)               | Parquet reader                               | Yes            | Yes           |
| [`quack`](https://tenzir.com/integrations/duckdb.md#quack)                   | Remote DuckDB connections                    | Yes            | Yes           |
| [`autocomplete`](https://tenzir.com/integrations/duckdb.md#autocomplete)     | SQL completion suggestions                   | Yes            | No            |
| [`tpcds`](https://tenzir.com/integrations/duckdb.md#tpc-ds)                  | TPC-DS benchmark queries and data generation | Yes            | No            |
| [`tpch`](https://tenzir.com/integrations/duckdb.md#tpc-h)                    | TPC-H benchmark queries and data generation  | Yes            | No            |

These extensions are compiled into Tenzir’s bundled DuckDB library and load when the embedded database starts. For local queries, you don’t need an `INSTALL` or `LOAD` statement, a runtime download, or a pre-populated extension cache. Automatic extension installation and community extensions are disabled.

Some extensions are only included in dynamic builds, as noted in their sections. To inspect the extensions loaded in your build:

```tql
from_duckdb ":memory:",
  sql="SELECT extension_name FROM duckdb_extensions() WHERE loaded ORDER BY extension_name"
```

CSV support is part of DuckDB itself and doesn’t require an extension.

### Core functions

The `core_functions` extension provides DuckDB’s standard scalar functions, including string, numeric, and date functions. Use them in SQL to transform values before they enter your pipeline:

```tql
from_duckdb "assets.duckdb",
  sql="SELECT lower(hostname) AS hostname, regexp_extract(owner, 'user=(.*)', 1) AS username FROM assets"
```

### Excel

The [Excel extension](https://duckdb.org/docs/current/core_extensions/excel) provides `read_xlsx` for reading `.xlsx` workbooks. It doesn’t read the older `.xls` format.

Use an in-memory database to turn a worksheet into a stream of events. The `sheet` argument selects a worksheet by name; without it, DuckDB reads the first worksheet. Set `header=true` to use the first row as field names:

```tql
from_duckdb ":memory:",
  sql="SELECT * FROM read_xlsx('assets.xlsx', sheet='Assets', header=true)"
```

DuckDB infers column types from the worksheet. Set `all_varchar=true` when you want text instead, for example when importing an indicator list. The `range` argument selects a rectangular cell range:

```tql
from_duckdb ":memory:",
  sql="SELECT * FROM read_xlsx('indicators.xlsx', sheet='Indicators', range='A1:B500', header=true, all_varchar=true)"
```

### HTTP filesystem

The [HTTP filesystem extension](https://duckdb.org/docs/current/core_extensions/httpfs/overview), `httpfs`, provides HTTP(S) and S3 access for DuckDB’s file readers. It also supplies Quack’s HTTP/TLS transport.

For example, query a public Parquet file over HTTPS:

```tql
from_duckdb ":memory:",
  sql="SELECT src_ip, bytes FROM read_parquet('https://data.example.com/flows.parquet') WHERE bytes > 1000000"
```

The `token` and `tls` parameters of `from_duckdb` configure Quack connections, not HTTP filesystem queries.

### ICU

The [ICU extension](https://duckdb.org/docs/current/core_extensions/icu) provides time-zone handling and locale-aware collations. It is bundled only in dynamic builds, not in static binaries.

For example, format a timestamp as a local clock time:

```tql
from_duckdb ":memory:",
  sql="SELECT strftime(TIMESTAMPTZ '2026-01-01 09:00:00+00' AT TIME ZONE 'Europe/Berlin', '%Y-%m-%d %H:%M:%S') AS local_time"
```

The result is a string. Tenzir’s `time` type represents an instant and doesn’t retain a time-zone label.

### JSON

The [JSON extension](https://duckdb.org/docs/current/data/json/overview) provides JSON file readers and SQL functions for JSON values. Use `read_json_auto` to infer the schema of JSON or newline-delimited JSON files, then filter or aggregate them with SQL:

```tql
from_duckdb ":memory:",
  sql="SELECT hostname, action FROM read_json_auto('audit/*.jsonl') WHERE action = 'login'"
```

### Parquet

The [Parquet extension](https://duckdb.org/docs/current/data/parquet/overview) provides `read_parquet`. DuckDB can push column selection and predicates into the file scan, avoiding reads of unneeded columns and row groups:

```tql
from_duckdb ":memory:",
  sql="SELECT src_ip, dst_ip, bytes FROM read_parquet('flows/*.parquet') WHERE bytes > 1000000"
```

The reader accepts file globs and supports Hive-style partitioned datasets with `hive_partitioning=true`.

### Quack

The `quack` extension connects to a remote DuckDB server over [Quack](https://duckdb.org/docs/current/quack/overview). Both

[`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md) and [`to_duckdb`](https://tenzir.com/docs/reference/operators/to_duckdb.md) support remote connections. Local-file locking rules don’t apply to remote connections.

```tql
from_duckdb "quack:analytics.example.com:443",
  token=secret("duckdb-token"), table="alerts"
```

SQL runs on the server. File paths and available readers refer to that server, not to the Tenzir host or its bundled extensions:

```tql
from_duckdb "quack:analytics.example.com:443",
  token=secret("duckdb-token"),
  sql="SELECT * FROM read_parquet('/data/alerts.parquet')"
```

Quack is a beta protocol. The bundled DuckDB 1.5.5 client was tested against a DuckDB 1.5.5 server with Quack revision `c1548111c1bfd16207e22fd3cb7e4bde1335b9d0`. Compatibility with other versions is not guaranteed.

### Autocomplete

The [Autocomplete extension](https://duckdb.org/docs/current/core_extensions/autocomplete) provides SQL completion suggestions through `sql_auto_complete`. It is bundled only in dynamic builds and doesn’t provide TQL completions:

```tql
from_duckdb ":memory:",
  sql="SELECT suggestion FROM sql_auto_complete('SELECT ') LIMIT 5"
```

### TPC-DS

The [TPC-DS extension](https://duckdb.org/docs/current/core_extensions/tpcds) provides benchmarking queries and data generation. It is bundled only in dynamic builds. You can inspect its queries through `from_duckdb`:

```tql
from_duckdb ":memory:",
  sql="SELECT query_nr, query FROM tpcds_queries() WHERE query_nr = 1"
```

Data generation modifies the database and isn’t supported through the read-only `from_duckdb` operator.

### TPC-H

The [TPC-H extension](https://duckdb.org/docs/current/core_extensions/tpch) provides another benchmark suite and is bundled only in dynamic builds. Inspect its queries with `tpch_queries`:

```tql
from_duckdb ":memory:",
  sql="SELECT query_nr, query FROM tpch_queries() WHERE query_nr = 1"
```

As with TPC-DS, data generation isn’t supported through `from_duckdb`.

If you need another DuckDB extension bundled with Tenzir, [contact us](https://tenzir.com/contact.md) and tell us about your use case.

## See Also

* [Read from data stores](../guides/collect/read-from-data-stores.md)
* [Send to destinations](../guides/route/send-to-destinations.md)
