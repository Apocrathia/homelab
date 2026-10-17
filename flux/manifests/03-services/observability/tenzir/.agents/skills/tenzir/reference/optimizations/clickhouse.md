---
title: "ClickHouse"
canonical: https://tenzir.com/docs/reference/optimizations/clickhouse
source: https://tenzir.com/docs/reference/optimizations/clickhouse.md
section: "Docs"
---

# ClickHouse

> When fromclickhouse reads a table, it lets ClickHouse filter the rows, pick the columns, stop after enough rows, and compute summaries, so that ClickHouse reads and sends only what the pipeline needs instead of the whole table. This page describes when that happens, which filters ClickHouse evaluates, and why the others stay in Tenzir. The optimizations overview explains how Tenzir optimizes pipelines in general and compares the databases.

When [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md) reads a table, it lets ClickHouse filter the rows, pick the columns, stop after enough rows, and compute summaries, so that ClickHouse reads and sends only what the pipeline needs instead of the whole table. This page describes when that happens, which filters ClickHouse evaluates, and why the others stay in Tenzir. The [optimizations overview](../optimizations.md) explains how Tenzir optimizes pipelines in general and compares the databases.

## When it applies

The operator reads in one of these modes, and only table mode optimizes:

* **Table mode** reads a table that you name with `table`, as in `from_clickhouse table="logs.events"`. The operator writes the query itself and adds the work of the operators that follow it. The rest of this page describes this mode.
* **SQL mode** sends the query that you write with `sql` exactly as written, and Tenzir applies the rest of the pipeline to its result. To have ClickHouse filter, write the filter into your query.

## How the query changes

The operator turns the operators that follow it into parts of its `SELECT`:

* [`where`](https://tenzir.com/docs/reference/operators/where.md) becomes a `WHERE` clause, as far as ClickHouse evaluates the filter exactly like Tenzir.
* [`select`](https://tenzir.com/docs/reference/operators/select.md) narrows the selected columns to the fields that the pipeline reads, down to the elements of named tuples.
* [`head`](https://tenzir.com/docs/reference/operators/head.md) becomes a `LIMIT`, if every filter before it went into the query.

For example, the pipeline

```tql
from_clickhouse table="logs.events"
where ts > 2024-01-01 and src_ip in 10.0.0.0/8 and code in [401, 403]
select id, message, meta.level
head 100
```

sends a query equivalent to

```sql
SELECT id, message, CAST(tuple(meta.level), 'Tuple(level Int64)') AS meta,
       ts, src_ip, code
FROM logs.events
WHERE ts > toDateTime('2024-01-01 00:00:00', 'UTC')
  AND src_ip BETWEEN toIPv4('10.0.0.0') AND toIPv4('10.255.255.255')
  AND code IN (401, 403)
LIMIT 100
```

The [`where`](https://tenzir.com/docs/reference/operators/where.md), [`select`](https://tenzir.com/docs/reference/operators/select.md), and [`head`](https://tenzir.com/docs/reference/operators/head.md) operators still run in Tenzir on the rows that ClickHouse returns, so the result is the same whether ClickHouse evaluated a filter or not. The exception is a pipeline in which ClickHouse computes a summary, as [Aggregations](clickhouse.md#aggregations) describes.

## Aggregations

When a [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) follows the operator, after the filters that went into the query, ClickHouse computes the summary with `GROUP BY` and returns one row per group instead of every matching row. This also applies to [`top`](https://tenzir.com/docs/reference/operators/top.md) and [`rare`](https://tenzir.com/docs/reference/operators/rare.md), which count with `summarize`. For example, the pipeline

```tql
from_clickhouse table="logs.events"
where code >= 400
summarize meta.source, events=count(), last.seen=max(ts)
where events >= 10
```

sends a query equivalent to

```sql
SELECT meta.source, toInt64(count()), maxOrNull(ts)
FROM logs.events
WHERE code >= 400
GROUP BY meta.source
```

Tenzir then arranges the result columns into the fields of the summary, such as `meta.source` and `last.seen`.

The summary may also follow [`select`](https://tenzir.com/docs/reference/operators/select.md), [`drop`](https://tenzir.com/docs/reference/operators/drop.md), [`set`](https://tenzir.com/docs/reference/operators/set.md), and assignments that keep or copy the fields that it reads, as [Aggregations in the source](../optimizations.md#aggregations-in-the-source) describes. ClickHouse then reads the original columns, and the result keeps the new names. For example, `select source=meta.source` followed by `summarize source, n=count()` groups by `meta.source` and returns the field `source`. A computed value for a field that the summary reads, such as `level = severity * 2` before `max(level)`, keeps the summary in Tenzir.

ClickHouse takes over the [`where`](https://tenzir.com/docs/reference/operators/where.md) before the summary together with the summary itself, and returns only the group keys and the aggregates. In the example, the `code` column never reaches Tenzir. The [`where`](https://tenzir.com/docs/reference/operators/where.md) after the summary runs in Tenzir. ClickHouse computes these parts of a summary:

* Group keys on `Bool`, integer, `String`, `FixedString`, `Enum`, `UUID`, `IPv4`, `IPv6`, and temporal columns, including `Nullable` and `LowCardinality` ones and elements of named tuples.
* `count()`, and `count(x)` on such columns and on floating-point columns, counted as `Int64`, which Tenzir reads as `int` like the result of `count`.
* `min(x)` and `max(x)` on integer and temporal columns, as `minOrNull` and `maxOrNull`, so that a summary without group keys over no rows yields `null` like Tenzir instead of the type’s default value.

Values that Tenzir cannot represent, such as a `Date32` past the year 2262, group, count, and compare as `null`, as they do in Tenzir. Like Tenzir, ClickHouse returns one row for an empty table when the summary has no group keys, and no rows when it has some. The rows arrive in the order in which ClickHouse returns the groups. Since a table has no defined row order, this is as valid as the first-seen order in which [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) emits groups. Use [`sort`](https://tenzir.com/docs/reference/operators/sort.md) when you need a particular order.

Everything else runs in Tenzir with the same result. The operator then reads the rows as usual and summarizes them itself, still selecting only the columns that the summary reads:

* A summary with another function, such as `sum`, an option such as `emit`, or a group key or argument that is not a field.
* A summary after a [`head`](https://tenzir.com/docs/reference/operators/head.md), after a predicate that stays in Tenzir, or behind an operator that computes a field that the summary reads.
* Group keys and extremes of floating-point columns, since `GROUP BY` considers `NaN` equal to itself and `-0.0` equal to `0.0`, and Tenzir’s result for `NaN` depends on the order of the rows.
* Columns without an exact counterpart in Tenzir, such as `Decimal` columns, and generated columns.
* Tables with a catch-all column, where the operator also reads every column, as [Catch-all tables](clickhouse.md#catch-all-tables) describes.

When ClickHouse computes a summary, Tenzir does not see the individual rows, so it does not warn about values that it reads as `null`, such as a `Date32` past the year 2262.

## Catch-all tables

A table with a [catch-all column](../../integrations/clickhouse.md#catch-all-columns) returns reconstructed events: the fields of the catch-all move to the top level, and dotted columns become nested fields. A filter goes into the query only if it refers to a column whose name has no dots and whose type is not `JSON`, because only those columns keep their name and value in the event. All other filters run in Tenzir. A [`select`](https://tenzir.com/docs/reference/operators/select.md) does not narrow the columns, because a field can be split between a column and the catch-all, so the query reads every column. For the same reason, a [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) always runs in Tenzir on the reconstructed events. A [`head`](https://tenzir.com/docs/reference/operators/head.md) still becomes a `LIMIT` if every filter went into the query.

## Filters that ClickHouse evaluates

The operator puts a filter into the query only if ClickHouse evaluates it exactly like Tenzir. These filters qualify:

* Comparisons of a column with a literal of matching kind: numbers against integer and floating-point columns, strings against `String` columns, `time` values against `Date`, `Date32`, `DateTime`, and `DateTime64` columns, and `ip` values against `IPv4` and `IPv6` columns. Booleans, enum names, UUIDs, and `FixedString` values compare for equality only.
* Null checks with `== null` and `!= null`.
* `in` with a list of such literals, and `ip in subnet`.
* Comparisons between two columns of the same kind. Temporal columns must share their exact type, such as two `DateTime64(3)` columns.
* The string functions `starts_with`, `ends_with`, and `length_bytes`, and substring search with `"needle" in haystack`. With `ignore_case=true`, `starts_with` and `ends_with` translate approximately, as explained in [Case-insensitive matching](clickhouse.md#case-insensitive-matching), and so does `match_regex`, as explained in [Regular expressions](clickhouse.md#regular-expressions).
* Arithmetic that cannot overflow: `+`, `-`, and `*` on integer columns of at most 32 bits with a literal whose magnitude is below 2^31, and any `+`, `-`, `*`, or `/` that yields a floating-point number, except division by zero.
* Expressions that consist of literals only, such as `1024 * 1024` or `2024-01-01 + 1d`, which are computed ahead of time.
* `and`, `or`, and `not`.
* Bare boolean columns.

Literals are rendered in the column’s own ClickHouse type, so the comparison never depends on the session time zone and never converts the column. A `time` literal that falls between two values of a coarser column, such as `2024-01-01T12:00:00` against a `Date` column, resolves to the neighboring value for orderings and to `false` for equality. Values that Tenzir cannot represent, such as a `Date32` past the year 2262, compare as `null` in both places.

Nested fields address elements of named tuples, so `meta.level > 2` translates when `meta` is a `Tuple(source String, level Int64)` column, and selecting `meta.level` transfers only that element. A tuple with an element of an [unsupported type](../operators/from_clickhouse.md#types) is absent from the result as a whole, so its elements are neither compared in SQL nor narrowed by a projection. Pushed predicates produce the same rows as TQL, including for `null` values, so `not (x == 1)` keeps rows where `x` is `null` either way.

## Case-insensitive matching

A predicate such as `msg.starts_with("error", ignore_case=true)` goes into the query as `startsWith(lowerUTF8(msg), lowerUTF8('error'))`. This is a deliberate exception to the rule that pushdown never changes results, made so that a common filter reaches the database. ClickHouse lowercases one character at a time, which agrees with TQL for ASCII and most other text. TQL applies full Unicode case folding instead, which differs for a few characters: it folds `ß` to `ss`, so `"Straße".starts_with("strass", ignore_case=true)` is `true` in TQL but matches no row in ClickHouse.

## Regular expressions

A predicate such as `msg.match_regex("^ERROR [0-9]+")` goes into the query as `match(msg, '(?-s)^ERROR [0-9]+')`. Both TQL and ClickHouse use the RE2 library. ClickHouse lets `.` match a newline, and the `(?-s)` prefix turns that off again, so that the pattern matches the same text as in TQL. Like case-insensitive matching, this is a deliberate exception to the rule that pushdown never changes results: ClickHouse bundles its own release of RE2, which may disagree with TQL’s on rarely used syntax, and its behavior is undefined for `String` values that are not valid UTF-8. A pattern that contains a NUL byte runs in Tenzir.

## IP addresses in string columns

Many ClickHouse tables store IP addresses as `String`. In TQL, a string never equals an `ip` value, so a predicate such as `src == 1.1.1.1` against such a column would match no rows. This is another deliberate exception to the rule that pushdown never changes results: in table mode, the operator resolves such a predicate by the column’s type. An `ip` literal that is compared for equality with a `String` column, or listed in an `in` test against one, becomes its canonical text. The predicate `src == 1.1.1.1` then reads `src == "1.1.1.1"` and is pushed as `src = '1.1.1.1'`, which also lets ClickHouse use an index on the column. The canonical text is the dotted form for IPv4 and the lowercase compressed form for IPv6, so `2001:DB8::1` in TQL matches the text `2001:db8::1` but not `2001:0db8::1`.

Membership in a subnet has no textual form. The operator rewrites `src in 10.0.0.0/8` to `src.ip() in 10.0.0.0/8`, which parses the column in Tenzir, and pushes a *prefilter* that lets ClickHouse drop rows it can rule out with its own parser while keeping every row it cannot parse:

```sql
WHERE (toIPv6OrNull(src) IS NULL
       OR toIPv6OrNull(src) BETWEEN toIPv6('10.0.0.0') AND toIPv6('10.255.255.255'))
```

The rewritten predicate stays in the pipeline and decides the result, so the outcome only depends on the two parsers agreeing on the strings that both of them accept. Writing `src.ip() == 1.1.1.1` or `src.ip() in [...]` yourself gets the same prefilter. Ordering comparisons such as `src < 1.1.1.1` are not adapted, since the textual order of addresses is not their numeric order, and `src.ip() != 1.1.1.1` gets no prefilter, because it is `true` for strings that Tenzir cannot parse.

This adaptation applies to the predicates that the optimizer hands to the operator in table mode. In SQL mode, and for a `where` that the optimizer cannot move to the operator, TQL’s own semantics apply and you need to write `src == "1.1.1.1"` or `src.ip() in 10.0.0.0/8` explicitly.

## Filters that stay in Tenzir

Everything else runs in Tenzir, with the same result. This includes other functions, ordering comparisons on `Enum`, `UUID`, and `FixedString` columns, arithmetic on 64-bit integer columns or between two columns, `Decimal` and 128-bit integer columns, and comparisons against `duration` values.
