---
title: "from_mysql"
canonical: https://tenzir.com/docs/reference/operators/from_mysql
source: https://tenzir.com/docs/reference/operators/from_mysql.md
section: "Docs"
---

# from_mysql

> Reads events from a MySQL database.

Reads events from a MySQL database.

```tql
from_mysql [uri=string], [table=string], [sql=string], [show=string],
           [live=bool], [tracking_column=string],
           [host=string], [port=int], [user=string], [password=string],
           [database=string], [tls=bool|record]
```

## Description

The `from_mysql` operator reads data from a MySQL database. You can query data using a table name, raw SQL, or retrieve database metadata.

The operator supports three primary query modes:

1. **Table mode**: Read all rows from a table using the `table` parameter.
2. **SQL mode**: Execute a custom SQL query using the `sql` parameter.
3. **Show mode**: List database metadata using the `show` parameter. When `show="columns"`, also set `table` to the table name.

Internal metadata queries, such as resolving tracking columns for live mode, validate user-provided table and column names against a safe list and use MySQL prepared statements to safely bind values.

### `uri = string (optional)`

A MySQL connection URI in the format:

```plaintext
mysql://[user[:password]@]host[:port][/database]
```

When provided, the URI takes precedence over individual connection parameters. Credentials in the URI can be overridden by explicit `user` and `password` parameters.

### `table = string (optional)`

The name of the table to read from. This is mutually exclusive with `sql`. When `show="columns"`, set `table` to the table name.

### `sql = string (optional)`

A raw SQL query to execute. This is mutually exclusive with `table` and `show`.

Use raw strings for complex queries:

```tql
from_mysql sql=r"SELECT id, name FROM users WHERE active = 1"
```

### `show = string (optional)`

Retrieve database metadata. This is mutually exclusive with `sql`. When `show="columns"`, set `table` to the table name.

Supported values:

* `"tables"`: List all tables in the database
* `"columns"`: List all columns for the table specified in `table`

### `live = bool (optional)`

Enables continuous polling for new rows from a table. The operator tracks progress using a watermark on an integer column and polls every second for rows above the last-seen value. Mutually exclusive with `sql` and `show`. Requires `table`.

Defaults to `false`.

### `tracking_column = string (optional)`

The integer column to use for watermark tracking in live mode. The operator queries for rows where this column exceeds the last-seen watermark.

When omitted, the tracking column is auto-detected from the table’s auto-increment primary key. Requires `live=true`.

### `host = string (optional)`

The hostname or IP address of the MySQL server.

Defaults to `"localhost"`.

### `port = int (optional)`

The port number of the MySQL server.

Defaults to `3306`.

### `user = string (optional)`

The username for authentication. Supports the `secret` function for secure credential management.

Defaults to `"root"`.

### `password = string (optional)`

The password for authentication. Supports the `secret` function for secure credential management.

Defaults to `""`.

### `database = string (optional)`

The database to connect to.

### `tls = bool|record (optional)`

TLS configuration for the MySQL connection. Defaults to `false` (no TLS).

Use `tls=true` to enable TLS with default settings and certificate verification, or provide a record to customize specific options:

```tql
{
  skip_peer_verification: bool, // skip certificate verification.
  cacert: string,               // CA bundle to verify peers.
  certfile: string,             // client certificate to present.
  keyfile: string,              // private key for the client certificate.
}
```

## Types

The operator maps MySQL types to [Type System](../types.md) as follows:

| MySQL Type                                          | Tenzir Type | Notes                            |
| --------------------------------------------------- | ----------- | -------------------------------- |
| `TINYINT`, `SMALLINT`, `MEDIUMINT`, `INT`, `BIGINT` | `int64`     | Includes `BOOL` and `YEAR`       |
| The same types with `UNSIGNED`                      | `uint64`    |                                  |
| `FLOAT`, `DOUBLE`                                   | `double`    | `FLOAT` has 6 significant digits |
| `DECIMAL`, `NUMERIC`                                | `double`    | May lose precision               |
| `BLOB` and other binary blob types                  | `blob`      |                                  |
| All other types                                     | `string`    | The text that MySQL sends        |

All other types include `CHAR`, `VARCHAR`, `TEXT`, `BINARY`, `VARBINARY`, `DATE`, `DATETIME`, `TIMESTAMP`, `TIME`, `JSON`, `ENUM`, and `SET`. Convert them in the pipeline where you need another type, for example with the [`time`](https://tenzir.com/docs/reference/functions/time.md) or [`parse_json`](https://tenzir.com/docs/reference/functions/parse_json.md) functions.

## Optimizations

When the operator reads a table, it lets MySQL do the work of the [`where`](https://tenzir.com/docs/reference/operators/where.md), [`select`](https://tenzir.com/docs/reference/operators/select.md), and [`head`](https://tenzir.com/docs/reference/operators/head.md) operators that follow it, so that MySQL returns only the rows and columns that the pipeline needs. For one-shot table reads without `live=true`, MySQL can also compute a directly following [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md). With `live=true`, the summary stays in Tenzir because the input never ends. The page on [MySQL optimizations](../optimizations/mysql.md) describes which filters MySQL evaluates, and the [optimizations overview](../optimizations.md) explains how Tenzir optimizes pipelines in general.

## Examples

### Read all rows from a table

```tql
from_mysql table="users", host="db.example.com", database="mydb"
```

### Filter rows in MySQL

The `where`, `select`, and `head` operators go into the query, so MySQL returns only the ten matching rows with two columns:

```tql
from_mysql table="logins", host="db.example.com", database="audit"
where user == "admin" and result != "success"
select user, source
head 10
```

### Use a connection URI

```tql
from_mysql uri="mysql://admin:secret@db.example.com:3306/production", table="events"
```

### Execute a custom SQL query

```tql
from_mysql sql=r"SELECT id, name, created_at FROM users WHERE active = 1 LIMIT 100",
           host="localhost", database="app"
```

### Use secure credentials

```tql
from_mysql table="orders",
           host="db.example.com",
           user=secret("mysql-user"),
           password=secret("mysql-password"),
           database="shop"
```

### List all tables in a database

```tql
from_mysql show="tables", host="localhost", database="mydb"
```

### List columns for a specific table

```tql
from_mysql show="columns", table="users", host="localhost", database="mydb"
```

### Enable TLS with defaults

```tql
from_mysql table="events",
           host="db.example.com",
           database="production",
           tls=true
```

### Connect with TLS but skip peer verification

```tql
from_mysql table="events",
           host="db.example.com",
           database="production",
           tls={skip_peer_verification: true}
```

### Connect with TLS using a CA certificate

```tql
from_mysql table="events",
           host="db.example.com",
           database="production",
           tls={cacert: "/path/to/ca.pem"}
```

### Stream new rows from a table

```tql
from_mysql table="events", live=true,
           host="db.example.com", database="mydb"
```

### Stream with an explicit tracking column

```tql
from_mysql table="events", live=true, tracking_column="event_id",
           host="db.example.com", database="mydb"
```

## See Also

* [Read from data stores](../../guides/collect/read-from-data-stores.md)
* [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md)
* [MySQL](../../integrations/mysql.md)
