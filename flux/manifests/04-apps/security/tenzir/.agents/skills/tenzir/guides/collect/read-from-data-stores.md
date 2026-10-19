---
title: "Read from data stores"
canonical: https://tenzir.com/docs/guides/collect/read-from-data-stores
source: https://tenzir.com/docs/guides/collect/read-from-data-stores.md
section: "Docs"
---

# Read from data stores

> This guide shows you how to read from external data stores with TQL. You’ll learn how to read full tables, push filters into SQL, inspect metadata, and stream new rows.

This guide shows you how to read from external data stores with TQL. You’ll learn how to read full tables, push filters into SQL, inspect metadata, and stream new rows.

Today, this guide focuses on [`from_mysql`](https://tenzir.com/docs/reference/operators/from_mysql.md), [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md), and [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md). As Tenzir adds more data store integrations, the same patterns will apply.

## Read a table

Use `table=...` to read a table as structured events.

Read a ClickHouse table:

```tql
from_clickhouse table="security.events",
                host="clickhouse.example.com",
                password=secret("CLICKHOUSE_PASSWORD"),
                tls=false
```

Or use a ClickHouse URI:

```tql
from_clickhouse uri="clickhouse://default:secret@clickhouse.example.com:9000/security",
                table="events",
                tls=false
```

Read a Hydrolix table with [`from_hydrolix`](https://tenzir.com/docs/reference/operators/from_hydrolix.md). Pass the URL of the cluster and a token:

```tql
let $since = now() - 1h
from_hydrolix "https://acme.hydrolix.live",
  token=secret("HYDROLIX_TOKEN"),
  table="security.events"
where time > $since
```

Read a MySQL table:

```tql
from_mysql table="users",
           host="mysql.example.com",
           user="tenzir",
           password=secret("MYSQL_PASSWORD"),
           database="identity"
```

Read a table from a local DuckDB database file. DuckDB runs embedded in Tenzir, so there is no connection to configure:

```tql
from_duckdb "alerts.duckdb", table="alerts"
```

With ClickHouse, the operators that follow travel into the query. A `where` becomes a `WHERE` clause, a `select` narrows the columns, and a `head` adds a `LIMIT`, so this pipeline reads only matching rows and the columns it names:

```tql
from_clickhouse table="security.events"
where severity >= 3 and source == "fw"
select time, host, message
head 1000
```

The reference for [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md) lists which predicates translate. Anything that does not, such as a function call, runs in Tenzir with the same result. With MySQL, `table` mode fetches every row and the pipeline filters afterwards.

## Shape results with SQL

Use `sql=...` when the data store should sort, aggregate, join, or cast before Tenzir receives the rows, or when you read from MySQL and want the database to filter.

Sort in ClickHouse:

```tql
from_clickhouse sql="SELECT time, host, severity, message FROM events WHERE severity >= 3 ORDER BY time DESC",
                host="clickhouse.example.com",
                password=secret("CLICKHOUSE_PASSWORD"),
                tls=false
```

Filter in MySQL:

```tql
from_mysql sql="SELECT id, user, last_login FROM users WHERE active = 1 ORDER BY last_login DESC",
           host="mysql.example.com",
           user="tenzir",
           password=secret("MYSQL_PASSWORD"),
           database="identity"
```

Query files through DuckDB. An in-memory DuckDB database reads Parquet, CSV, and JSON files directly, and the query result becomes the event stream:

```tql
from_duckdb ":memory:",
  sql="SELECT * FROM 'flows/*.parquet' WHERE bytes > 1000000"
```

This pattern lets you use the full query language of the source system. Tenzir sends the query as is and applies the rest of the pipeline to the result.

## Inspect metadata

All three operators can return metadata instead of table rows.

List ClickHouse tables in a database:

```tql
from_clickhouse sql="SHOW TABLES FROM security",
                host="clickhouse.example.com",
                password=secret("CLICKHOUSE_PASSWORD"),
                tls=false
```

Show the columns of a MySQL table:

```tql
from_mysql table="users",
           show="columns",
           host="mysql.example.com",
           user="tenzir",
           password=secret("MYSQL_PASSWORD"),
           database="identity"
```

List the tables in a DuckDB database:

```tql
from_duckdb "alerts.duckdb",
  sql="SELECT table_schema, table_name FROM information_schema.tables"
```

Use metadata queries when you want to discover available tables, inspect a schema, or validate assumptions before you run a larger pipeline. In ClickHouse and DuckDB, prefer regular SQL such as `SHOW`, `DESCRIBE`, or queries against system catalogs.

## Poll for new rows

MySQL and DuckDB support a live polling mode for tables with a monotonically increasing integer tracking column.

```tql
from_mysql table="audit_log",
           live=true,
           tracking_column="id",
           host="mysql.example.com",
           user="tenzir",
           password=secret("MYSQL_PASSWORD"),
           database="security"
where severity == "high"
```

With DuckDB, live mode picks up rows that other pipelines in the same node append to the table:

```tql
from_duckdb "alerts.duckdb", table="alerts", live=true, tracking_column="id"
where severity == "high"
```

Use this mode when you want to turn a database table into a continuously polled event source.

`from_clickhouse` does not currently provide a comparable live mode. It runs a query, emits the result, and then finishes.

## Shape rows after reading

All three operators produce structured events, so you can transform the result right away.

```tql
from_clickhouse sql="SELECT host, severity, message FROM events",
                host="clickhouse.example.com",
                password=secret("CLICKHOUSE_PASSWORD"),
                tls=false
where severity >= 3
message = message.to_upper()
```

This lets you treat database rows like any other event stream in Tenzir.

## See also

* [Read from message brokers](read-from-message-brokers.md)
* [Filter and select data](../optimize/filter-and-select-data.md)
* [Send to destinations](../route/send-to-destinations.md)
* [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md)
* [`from_mysql`](https://tenzir.com/docs/reference/operators/from_mysql.md)
* [ClickHouse](../../integrations/clickhouse.md)
* [Hydrolix](../../integrations/hydrolix.md)
* [MySQL](../../integrations/mysql.md)
