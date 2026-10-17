---
title: "Microsoft SQL Server"
canonical: https://tenzir.com/docs/reference/optimizations/microsoft-sql
source: https://tenzir.com/docs/reference/optimizations/microsoft-sql.md
section: "Docs"
---

# Microsoft SQL Server

> When frommicrosoftsql reads a table, it lets SQL Server filter the rows, pick the columns, stop after enough rows, and compute summaries, so that SQL Server sends only what the pipeline needs instead of the whole table. This page describes when that happens, which filters SQL Server evaluates, and why the others stay in Tenzir. The optimizations overview explains how Tenzir optimizes pipelines in general and compares the databases.

When [`from_microsoft_sql`](https://tenzir.com/docs/reference/operators/from_microsoft_sql.md) reads a table, it lets SQL Server filter the rows, pick the columns, stop after enough rows, and compute summaries, so that SQL Server sends only what the pipeline needs instead of the whole table. This page describes when that happens, which filters SQL Server evaluates, and why the others stay in Tenzir. The [optimizations overview](../optimizations.md) explains how Tenzir optimizes pipelines in general and compares the databases.

## When it applies

The operator reads in one of these modes, and only table mode optimizes:

* **Table mode** reads a table that you name with `table`, as in `from_microsoft_sql table="dbo.alerts"`. The operator writes the query itself and adds the work of the operators that follow it. The rest of this page describes this mode.
* **SQL mode** sends the query that you write with `sql` or `query` exactly as written, and Tenzir applies the rest of the pipeline to its result. To have SQL Server filter, write the filter into your query.
* **Live mode**, with `live=true`, polls a table for new rows. Every poll carries the filters and the columns of table mode, but neither the limit, since the limit counts rows across polls, nor a summary, since the input of a live read never ends.

## How the query changes

The operator turns the operators that follow it into parts of its `SELECT`:

* [`where`](https://tenzir.com/docs/reference/operators/where.md) becomes a `WHERE` clause, as far as SQL Server evaluates the filter exactly like Tenzir.
* [`select`](https://tenzir.com/docs/reference/operators/select.md) narrows the selected columns to those that the pipeline reads.
* [`head`](https://tenzir.com/docs/reference/operators/head.md) becomes a `TOP`, if every filter before it went into the query.

For example, the pipeline

```tql
from_microsoft_sql table="dbo.alerts", host="db.example.com", database="soc"
where severity >= 3 and rule.starts_with("ET ")
select id, message
head 100
```

sends a query equivalent to

```sql
SELECT TOP (100) [id], [message], [severity], [rule]
FROM [dbo].[alerts]
WHERE [severity] >= 3
  AND LEFT(<hex of rule>, LEN('455420')) = '455420'
```

Here, `<hex of rule>` stands for the bytes of the `rule` column in hexadecimal, which the [text comparisons](microsoft-sql.md#text-comparisons) section explains. The [`where`](https://tenzir.com/docs/reference/operators/where.md), [`select`](https://tenzir.com/docs/reference/operators/select.md), and [`head`](https://tenzir.com/docs/reference/operators/head.md) operators still run in Tenzir on the rows that SQL Server returns, so the result is the same whether SQL Server evaluated a filter or not. The exception is a pipeline in which SQL Server computes a summary, as [Aggregations](microsoft-sql.md#aggregations) describes.

## Aggregations

When a [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) follows the operator, after the filters that went into the query, SQL Server computes the summary with `GROUP BY` and returns one row per group instead of every matching row. This also applies to [`top`](https://tenzir.com/docs/reference/operators/top.md) and [`rare`](https://tenzir.com/docs/reference/operators/rare.md), which count with `summarize`. For example, the pipeline

```tql
from_microsoft_sql table="alerts", host="db.example.com", database="soc"
where severity >= 3
summarize rule, alerts=count(), last.seen=max(ts)
where alerts >= 10
```

sends a query equivalent to

```sql
SELECT MIN([rule]), COUNT_BIG(*), MAX([ts])
FROM [alerts]
WHERE [severity] >= 3
GROUP BY <hex of rule>
```

Tenzir then arranges the result columns into the fields of the summary, such as `last.seen`. SQL Server takes over the [`where`](https://tenzir.com/docs/reference/operators/where.md) before the summary together with the summary itself, and returns only the group keys and the aggregates. In the example, the `severity` column never reaches Tenzir. The [`where`](https://tenzir.com/docs/reference/operators/where.md) after the summary runs in Tenzir. SQL Server computes these parts of a summary:

The summary may also follow [`select`](https://tenzir.com/docs/reference/operators/select.md), [`drop`](https://tenzir.com/docs/reference/operators/drop.md), [`set`](https://tenzir.com/docs/reference/operators/set.md), and assignments that keep or copy the fields that it reads, as [Aggregations in the source](../optimizations.md#aggregations-in-the-source) describes. SQL Server then reads the original columns, and the result keeps the new names. For example, `select ip=src_ip` followed by `summarize ip, n=count()` groups by the `src_ip` column and returns the field `ip`. A computed value for a field that the summary reads, such as `level = severity * 2` before `max(level)`, keeps the summary in Tenzir.

* Group keys on `bit`, integer, temporal, `uniqueidentifier`, and text columns. A text key groups by the hexadecimal spelling of its bytes, as the [text comparisons](microsoft-sql.md#text-comparisons) section describes, so `a`, `A`, and `a `form three groups like in Tenzir. Collations and padding would merge them into one. A `datetimeoffset` key groups by its instant, which Tenzir reads in UTC.
* `count()`, and `count(x)` on such columns and on floating-point columns, as `COUNT_BIG`, which does not overflow at 2^31 like `COUNT`.
* `min(x)` and `max(x)` on integer and temporal columns.

Like Tenzir, SQL Server returns one row for an empty table when the summary has no group keys, with `0` for `count()` and `null` for `min` and `max`, and no rows when it has some. The rows arrive in the order in which SQL Server returns the groups. Since a table has no defined row order, this is as valid as the first-seen order in which [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) emits groups. Use [`sort`](https://tenzir.com/docs/reference/operators/sort.md) when you need a particular order.

Everything else runs in Tenzir with the same result. The operator then reads the rows as usual and summarizes them itself, still selecting only the columns that the summary reads:

* A summary with another function, such as `sum`, an option such as `emit`, or a group key or argument that is not a field.
* A summary after a [`head`](https://tenzir.com/docs/reference/operators/head.md), after a predicate that stays in Tenzir, or behind an operator that computes a field that the summary reads.
* Group keys and extremes of `float` and `real` columns, since `GROUP BY` considers `-0.0` equal to `0.0`, and extremes of text.
* Columns that Tenzir reads differently from SQL Server, such as `decimal`, `money`, and `datetime`, and `nchar` and `nvarchar` on servers without UTF-8 collations.

When SQL Server computes a summary, Tenzir does not see the individual rows. A temporal value that Tenzir cannot represent, such as a `datetime2` in the year 9999, fails a read that returns it, so a summary that SQL Server computes can succeed where reading the rows would fail.

## Filters that SQL Server evaluates

The operator puts a filter into the query only if SQL Server evaluates it exactly like Tenzir. These filters qualify:

* Comparisons of a column with a literal of matching kind: numbers against `tinyint`, `smallint`, `int`, `bigint`, `real`, and `float` columns, strings against `char`, `varchar`, `nchar`, `nvarchar`, and `uniqueidentifier` columns, and `time` values against `date`, `datetime2`, `datetimeoffset`, and `smalldatetime` columns. Booleans compare with `bit` columns for equality only.
* Null checks with `== null` and `!= null`.
* Membership tests with `in` and a list of such literals.
* Comparisons between two columns of the same kind. Temporal columns must share their exact type, such as two `datetime2(3)` columns.
* Bare `bit` columns, such as `where active`, which go into the query as `[active] = 1`, since T-SQL has no boolean values.
* The string functions `starts_with`, `ends_with`, and `length_bytes`, and substring search with `"needle" in haystack`.
* Arithmetic that cannot overflow: `+`, `-`, and `*` on integer columns of at most 32 bits with a literal whose magnitude is below 2^31, and any `+`, `-`, `*`, or `/` that yields a floating-point number, except division by zero. SQL Server computes in the types of the operands, so the query widens the column first: `n + 1 > 5` becomes `CAST(n AS bigint) + 1 > 5`.
* Expressions that consist of literals only, such as `2024-01-01 + 1d`, which are computed ahead of time.
* The boolean operators `and`, `or`, and `not`.
* An `ip` literal compared with a text column, which compares as the canonical text of the address.

Time literals take the column’s own type and are spelled in ISO 8601, so a comparison does not depend on the session’s language or date format, and a `datetimeoffset` compares as an instant, whatever its offset. A `time` literal that falls between two values of a coarser column, such as `2024-01-01T12:00:00` against a `date` column, resolves to the neighboring value for orderings and to `false` for equality.

A limit goes into the query as `TOP (n)` up to 9,223,372,036,854,775,807, the largest `bigint`. A larger limit is enforced in Tenzir.

## Text comparisons

SQL Server compares text under the collation of the column, and the default collations ignore case and accents. In addition, every comparison pads the shorter operand, even under a binary collation: `N'a' = N'a '` holds, and so does `N'a' + NCHAR(9) < N'a'`, which sorts a tab after the padding space. Binary values pad with zero bytes, so `0x61 = 0x6100` holds, too.

The operator therefore compares text by the hexadecimal spelling of the bytes that Tenzir sees: the stored bytes of `char` and `varchar`, the UTF-8 encoding of `nchar` and `nvarchar`, and the lowercase text of a `uniqueidentifier`. Every hexadecimal digit sorts after the padding space, so comparisons of these spellings, `IN`, `LEFT`, and `RIGHT` compare bytes exactly like TQL. SQL Server cannot use an index on such a column for the comparison, but it still saves transferring the rows that the predicate drops.

Converting `nchar` and `nvarchar` to UTF-8 needs the UTF-8 collations of SQL Server 2019 and Azure SQL. On older servers, predicates on these columns run in Tenzir.

## Filters that stay in Tenzir

Everything else runs in Tenzir, with the same result. This includes:

* Comparisons on `decimal`, `numeric`, `money`, and `smallmoney` columns, which SQL Server compares exactly, while Tenzir sees the nearest `double`.
* Comparisons on `datetime` columns, whose ticks of 1/300 second Tenzir rounds to milliseconds, and on `time` columns, which Tenzir reads as `duration`.
* `text`, `ntext`, `xml`, `binary`, `varbinary`, and `image` columns.
* Hidden columns, which `SELECT *` leaves out, so that Tenzir never sees them.
* Case-insensitive matching with `ignore_case=true`, and regular expressions, which T-SQL does not have.
* Arithmetic on `bigint` columns or between two columns.
* Subnet membership tests on text columns, such as `src in 10.0.0.0/8`.
* All other functions.

## Selected columns

Column names must match exactly, including their case: SQL Server finds a column regardless of case, but names the result column as the query spells it. When a predicate that runs in Tenzir calls a function, or the pipeline reads `this`, the operator selects every column. When the pipeline needs no column at all, it selects the first one, so that every row arrives. In live mode, the tracking column is always selected.
