---
title: "MySQL"
canonical: https://tenzir.com/docs/reference/optimizations/mysql
source: https://tenzir.com/docs/reference/optimizations/mysql.md
section: "Docs"
---

# MySQL

> When frommysql reads a table, it lets MySQL filter the rows, pick the columns, stop after enough rows, and compute summaries, so that MySQL sends only what the pipeline needs instead of the whole table. This page describes when that happens, which filters MySQL evaluates, and why the others stay in Tenzir. The optimizations overview explains how Tenzir optimizes pipelines in general and compares the databases.

When [`from_mysql`](https://tenzir.com/docs/reference/operators/from_mysql.md) reads a table, it lets MySQL filter the rows, pick the columns, stop after enough rows, and compute summaries, so that MySQL sends only what the pipeline needs instead of the whole table. This page describes when that happens, which filters MySQL evaluates, and why the others stay in Tenzir. The [optimizations overview](../optimizations.md) explains how Tenzir optimizes pipelines in general and compares the databases.

## When it applies

The operator reads in one of these modes, and only table mode optimizes:

* **Table mode** reads a table that you name with `table`, as in `from_mysql table="alerts"`. The operator writes the query itself and adds the work of the operators that follow it. The rest of this page describes this mode.
* **SQL mode** sends the query that you write with `sql` exactly as written, and Tenzir applies the rest of the pipeline to its result. To have MySQL filter, write the filter into your query.
* **Live mode**, with `live=true`, polls a table for new rows. Every poll carries the filters and the columns of table mode, but neither the limit, since the limit counts rows across polls, nor a summary, since the input of a live read never ends.

## How the query changes

The operator turns the operators that follow it into parts of its `SELECT`:

* [`where`](https://tenzir.com/docs/reference/operators/where.md) becomes a `WHERE` clause, as far as MySQL evaluates the filter exactly like Tenzir.
* [`select`](https://tenzir.com/docs/reference/operators/select.md) narrows the selected columns to those that the pipeline reads.
* [`head`](https://tenzir.com/docs/reference/operators/head.md) becomes a `LIMIT`, if every filter before it went into the query.

For example, the pipeline

```tql
from_mysql table="alerts", host="db.example.com", database="soc"
where severity >= 3 and rule.starts_with("ET ")
select id, message
head 100
```

sends a query equivalent to

```sql
SELECT `id`, `message`, `severity`, `rule`
FROM `alerts`
WHERE `severity` >= 3
  AND LEFT(CAST(`rule` AS BINARY), LENGTH(_binary'ET ')) = _binary'ET '
LIMIT 100
```

The [text comparisons](mysql.md#text-comparisons) section explains the `CAST`. The [`where`](https://tenzir.com/docs/reference/operators/where.md), [`select`](https://tenzir.com/docs/reference/operators/select.md), and [`head`](https://tenzir.com/docs/reference/operators/head.md) operators still run in Tenzir on the rows that MySQL returns, so the result is the same whether MySQL evaluated a filter or not. The exception is a pipeline in which MySQL computes a summary, as [Aggregations](mysql.md#aggregations) describes.

## Aggregations

When a [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) follows the operator, after the filters that went into the query, MySQL computes the summary with `GROUP BY` and returns one row per group instead of every matching row. This also applies to [`top`](https://tenzir.com/docs/reference/operators/top.md) and [`rare`](https://tenzir.com/docs/reference/operators/rare.md), which count with `summarize`. For example, the pipeline

```tql
from_mysql table="alerts", host="db.example.com", database="soc"
where severity >= 3
summarize rule, alerts=count(), last.id=max(id)
where alerts >= 10
```

sends a query equivalent to

```sql
SELECT ANY_VALUE(`rule`), CAST(COUNT(*) AS SIGNED), MAX(`id`)
FROM `alerts`
WHERE `severity` >= 3
GROUP BY CAST(`rule` AS BINARY)
```

Tenzir then arranges the result columns into the fields of the summary, such as `last.id`. MySQL takes over the [`where`](https://tenzir.com/docs/reference/operators/where.md) before the summary together with the summary itself, and returns only the group keys and the aggregates. In the example, the `severity` column never reaches Tenzir. The [`where`](https://tenzir.com/docs/reference/operators/where.md) after the summary runs in Tenzir. MySQL computes these parts of a summary:

The summary may also follow [`select`](https://tenzir.com/docs/reference/operators/select.md), [`drop`](https://tenzir.com/docs/reference/operators/drop.md), [`set`](https://tenzir.com/docs/reference/operators/set.md), and assignments that keep or copy the fields that it reads, as [Aggregations in the source](../optimizations.md#aggregations-in-the-source) describes. MySQL then reads the original columns, and the result keeps the new names. For example, `select ip=src_ip` followed by `summarize ip, n=count()` groups by the `src_ip` column and returns the field `ip`. A computed value for a field that the summary reads, such as `level = severity * 2` before `max(level)`, keeps the summary in Tenzir.

* Group keys on integer columns, and on text columns that compare by their bytes as the [text comparisons](mysql.md#text-comparisons) section describes. A text key groups by its bytes, like Tenzir, so `a`, `A`, and `a `form three groups, which a collation such as `utf8mb4_0900_ai_ci` would merge into one.
* `count()`, and `count(x)` on such columns and on `DOUBLE` columns, cast to `SIGNED`, which Tenzir reads as `int` like the result of `count`.
* `min(x)` and `max(x)` on integer columns.

Like Tenzir, MySQL returns one row for an empty table when the summary has no group keys, with `0` for `count()` and `null` for `min` and `max`, and no rows when it has some. The rows arrive in the order in which MySQL returns the groups. Since a table has no defined row order, this is as valid as the first-seen order in which [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) emits groups. Use [`sort`](https://tenzir.com/docs/reference/operators/sort.md) when you need a particular order.

Everything else runs in Tenzir with the same result. The operator then reads the rows as usual and summarizes them itself, still selecting only the columns that the summary reads:

* A summary with another function, such as `sum`, an option such as `emit`, or a group key or argument that is not a field.
* A summary after a [`head`](https://tenzir.com/docs/reference/operators/head.md), after a predicate that stays in Tenzir, or behind an operator that computes a field that the summary reads.
* Group keys on `DOUBLE` columns, since `GROUP BY` considers `-0.0` equal to `0.0`, and extremes of anything but integers, since MySQL compares text under its collation and Tenzir rejects text.
* Columns that Tenzir reads differently from MySQL, such as `DECIMAL`, `DATETIME`, `ENUM`, and text in a character set other than UTF-8.

## Filters that MySQL evaluates

The operator puts a filter into the query only if MySQL evaluates it exactly like Tenzir. These filters qualify:

* Comparisons of a column with a literal of matching kind: numbers against integer and `DOUBLE` columns, and strings against `CHAR`, `VARCHAR`, and `TEXT` columns in the `utf8mb4`, `utf8mb3`, or `ascii` character set.
* Null checks with `== null` and `!= null`.
* Membership tests with `in` and a list of such literals.
* Comparisons between two columns of the same kind.
* The string functions `starts_with`, `ends_with`, and `length_bytes`, and substring search with `"needle" in haystack`. With `ignore_case=true`, `starts_with` and `ends_with` translate approximately: MySQL lowercases one character at a time, as described in [Results stay the same](../optimizations.md#results-stay-the-same).
* Expressions that consist of literals only, such as `1024 * 1024`, which are computed ahead of time.
* The boolean operators `and`, `or`, and `not`.
* An `ip` literal compared with a text column, which compares as the canonical text of the address.

## Text comparisons

MySQL compares text under the collation of the column, and the default collations ignore case, accents, and sometimes trailing spaces, so that `'alice' = 'Alice'` holds in MySQL but not in TQL. The operator therefore reads text columns as binary strings, such as `CAST(name AS BINARY)`, which compare their bytes, as TQL does. A binary string holds the bytes of the column’s own character set, which is why only UTF-8 columns translate. MySQL cannot use an index on such a column for the comparison, but it still saves transferring the rows that the predicate drops.

## Filters that stay in Tenzir

Everything else runs in Tenzir, with the same result. This includes:

* Comparisons on `FLOAT` and `DECIMAL` columns. MySQL sends `FLOAT` values with six significant digits, so Tenzir sees `3.14` where MySQL compares `3.1400001`, and it compares `DECIMAL` values exactly, while Tenzir sees the nearest `double`. The same applies to `DOUBLE` columns with a display precision, such as `DOUBLE(10,2)`.
* Columns that arrive as strings although MySQL compares their values, such as `DATE`, `DATETIME`, `TIMESTAMP`, `JSON`, `ENUM`, and `SET` columns, and `BIT`, `YEAR`, and binary string columns (see [Types](../operators/from_mysql.md#types)).
* Text columns in other character sets, such as `latin1`.
* Invisible columns, which `SELECT *` leaves out, so that Tenzir never sees them.
* Arithmetic. MySQL divides integers as `DECIMAL`, and it aborts the query when a `BIGINT UNSIGNED` result is negative or a `DOUBLE` result overflows.
* Regular expressions, which MySQL matches with ICU instead of RE2.
* Subnet membership tests on text columns, such as `src in 10.0.0.0/8`.
* All other functions.

## Selected columns

Column names must match exactly, including their case: MySQL finds a column regardless of case, but names the result column as the query spells it. When a predicate that runs in Tenzir calls a function, or the pipeline reads `this`, the operator selects every column. When the pipeline needs no column at all, it selects the first one, so that every row arrives.
