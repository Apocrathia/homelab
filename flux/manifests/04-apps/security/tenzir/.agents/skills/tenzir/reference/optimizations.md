---
title: "Overview"
canonical: https://tenzir.com/docs/reference/optimizations
source: https://tenzir.com/docs/reference/optimizations.md
section: "Docs"
---

# Overview

> Tenzir runs part of a pipeline where the data lives. When a pipeline reads from a database or a file and then filters events, selects fields, or keeps only the first few, the source can often do that work itself: it skips the rows and columns that the rest of the pipeline would discard, instead of reading everything and throwing most of it away. You write the pipeline as usual, and Tenzir applies these optimizations automatically, without changing the result.

Tenzir runs part of a pipeline where the data lives. When a pipeline reads from a database or a file and then filters events, selects fields, or keeps only the first few, the source can often do that work itself: it skips the rows and columns that the rest of the pipeline would discard, instead of reading everything and throwing most of it away. You write the pipeline as usual, and Tenzir applies these optimizations automatically, without changing the result.

For example, take this pipeline:

```tql
from_mysql table="alerts", host="db.example.com", database="soc"
where severity >= 3
select id, message
head 10
```

Instead of fetching the whole `alerts` table, [`from_mysql`](https://tenzir.com/docs/reference/operators/from_mysql.md) sends a query that returns only the ten rows and the columns that the pipeline needs:

```sql
SELECT `id`, `message`, `severity` FROM `alerts` WHERE `severity` >= 3 LIMIT 10
```

This reference explains how such optimizations come about, what they promise about results, which operators apply them, and, for each database, which filters it evaluates.

## How it works

Before a pipeline runs, Tenzir’s [optimizer](../explanations/pipeline.md#optimization) walks it from the last operator to the first and tells each operator what the operators after it will do. We call this information **hints**, and there are four kinds:

* **Filters**: the predicates of the [`where`](https://tenzir.com/docs/reference/operators/where.md) operators.
* **Projections**: the fields that downstream operators need, such as the fields that [`select`](https://tenzir.com/docs/reference/operators/select.md) keeps or a final [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) reads.
* **Limits**: the number of events that [`head`](https://tenzir.com/docs/reference/operators/head.md) keeps.
* **Aggregations**: the groups and aggregation functions of a final [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) that directly follows the operator. Unlike the other hints, the optimizer offers an aggregation only after the walk, once it knows which filters and limits the operator took over.

An operator that understands a hint acts on it, for example by turning a filter into a `WHERE` clause. The [`where`](https://tenzir.com/docs/reference/operators/where.md), [`select`](https://tenzir.com/docs/reference/operators/select.md), and [`head`](https://tenzir.com/docs/reference/operators/head.md) operators stay in the pipeline and run on what the operator produces, so an operator that acts on a hint only partially, or not at all, still produces the same result. The exception is a source that [computes an aggregation](optimizations.md#aggregations-in-the-source), which takes over the [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) and the filters before it.

## Results stay the same

An optimization never changes the result of a pipeline, with three deliberate exceptions that let common filters reach a database:

* **Case-insensitive matching.** `starts_with` and `ends_with` with `ignore_case=true` use the database’s lowercase mapping. It agrees with TQL’s case folding for ASCII and most other text, but TQL folds `ß` to `ss`, so `"Straße".starts_with("strass", ignore_case=true)` is `true` in TQL and matches no row in the database.
* **Regular expressions.** `match_regex` uses the database’s release of RE2, which may disagree with TQL’s on rarely used syntax and on text that is not valid UTF-8.
* **IP addresses in string columns.** In TQL, a string never equals an `ip` value, so the comparison is `false`. When a database source compares a text column with an address, as in `src == 1.1.1.1`, it compares the canonical text of the address, `1.1.1.1`, instead, so that the common way of storing addresses as text works.

The [database pages](optimizations.md#filters-by-database) state which databases use these exceptions. Everything else the database cannot evaluate exactly like TQL runs in Tenzir, including when it would merely differ for `null` values, `NaN`, or text that differs only in case, accents, or trailing spaces.

## Operators that optimize

These operators act on hints:

| Operator                                                                                                  | Filters                      | Projections                | Limits                 | Aggregations          |
| --------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------- | ---------------------- | --------------------- |
| [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md)                       | In the query                 | Including tuple fields     | In the query           | In the query          |
| [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md)                               | In the query                 | Top-level columns          | In the query           | In the query          |
| [`from_microsoft_sql`](https://tenzir.com/docs/reference/operators/from_microsoft_sql.md)                 | In the query                 | Top-level columns          | In the query           | In the query          |
| [`from_mysql`](https://tenzir.com/docs/reference/operators/from_mysql.md)                                 | In the query                 | Top-level columns          | In the query           | In the query          |
| [`from_sentinelone_data_lake`](https://tenzir.com/docs/reference/operators/from_sentinelone_data_lake.md) | As prefilters in the query   | Including nested fields    | Without filters        | No                    |
| [`read_parquet`](https://tenzir.com/docs/reference/operators/read_parquet.md)                             | While decoding, by row group | Including record fields    | Stops decoding         | No                    |
| [`subscribe`](https://tenzir.com/docs/reference/operators/subscribe.md)                                   | At the node                  | No                         | No                     | No                    |
| [`sort`](https://tenzir.com/docs/reference/operators/sort.md)                                             | Moved before the sort        | Passed on                  | Keeps the top `N`      | No                    |
| [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) (final summary)                   | Kept after aggregation       | Group and aggregate inputs | Kept after aggregation | Offered to the source |

The reference page of each operator describes the details.

## Aggregation input projections

With final summary output, [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) supplies its own projection hint. You do not need an explicit [`select`](https://tenzir.com/docs/reference/operators/select.md) before aggregation:

```tql
from_mysql table="events", host="db.example.com", database="soc"
summarize host, events=count(), bytes=sum(bytes)
head 10
```

The source can read only `host` and `bytes`. For this table, the generated query is equivalent to:

```sql
SELECT `host`, `bytes` FROM `events`
```

This source does not compute the aggregation, so this is input projection, not remote aggregation. The query has no `GROUP BY`, `COUNT`, `SUM`, or `LIMIT`. Tenzir groups and aggregates the complete input, then keeps at most ten summary rows. Filters after `summarize` also stay after aggregation; filters before it can still reach the source. Some sources go further and [compute the aggregation](optimizations.md#aggregations-in-the-source).

These rules preserve the aggregation’s inputs and behavior:

* All grouping keys remain required, even if a later selection drops them.
* All aggregate arguments remain required, even if their results are unused, because evaluating them can produce diagnostics.
* Output aliases are not input dependencies. In the example, `events` does not request a source column.
* A keyless `summarize events=count()` needs the row count but no field values. A source may still read a column or emit a placeholder per row to preserve that count. Unless the source [computes the aggregation](optimizations.md#aggregations-in-the-source), it does not replace the pipeline with a remote `COUNT(*)`.
* Whole-event access, such as `collect(this)`, and dynamic field access, such as `sum(this[key])`, prevent narrowing.
* Options must be resolved before `summarize` supplies a projection. Inside runtime-bound subpipelines, such as [`group`](https://tenzir.com/docs/reference/operators/group.md) and [`window`](https://tenzir.com/docs/reference/operators/window.md), an unresolved `summarize` does not narrow the enclosing source.
* Input ordering requirements remain intact for order-sensitive aggregates. Trigger output, event output, and periodic summaries retain their barriers.

The [`top`](https://tenzir.com/docs/reference/operators/top.md) and [`rare`](https://tenzir.com/docs/reference/operators/rare.md) operators compile into `summarize` and [`sort`](https://tenzir.com/docs/reference/operators/sort.md), so they benefit from the same input projection. A following [`head`](https://tenzir.com/docs/reference/operators/head.md) still limits groups, not raw input events. Source-specific column rules and fields required by earlier operators still apply.

## Aggregations in the source

A source that reads from a database can compute a final summary itself, so that the database returns one row per group instead of every matching row. This happens only if the source reads a table once, in [table mode](optimizations.md#database-sources) and without `live=true`, if [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) follows the source, after every filter before it went into the query, and if the summary groups by fields and aggregates fields with functions that the database computes exactly like Tenzir. A query that you write with `sql` is sent as written, and a live read never ends, so the summary of either runs in Tenzir. The `summarize` and the filters before it then disappear from the pipeline, the database returns only the group and aggregate fields, and the operators after the summary run on it as usual.

The summary can follow the source directly or behind operators that keep every event and only keep, drop, or copy fields:

* [`select`](https://tenzir.com/docs/reference/operators/select.md) and [`drop`](https://tenzir.com/docs/reference/operators/drop.md) that keep the fields that the summary reads.
* Renames and copies with [`select`](https://tenzir.com/docs/reference/operators/select.md), [`set`](https://tenzir.com/docs/reference/operators/set.md), or a plain assignment, such as `select ip=src_ip` or `ip = src_ip`. The source then groups and aggregates the original fields, and the result keeps the new names.

For example, the source computes the summary of

```tql
from_mysql table="alerts", host="db.example.com", database="soc"
select ip=src_ip, ts, severity
where severity >= 3
summarize ip, alerts=count(), last=max(ts)
```

by grouping on the `src_ip` column. Every right-hand side of a [`select`](https://tenzir.com/docs/reference/operators/select.md) or [`set`](https://tenzir.com/docs/reference/operators/set.md) reads the original event, so `select a=b, b=a` swaps the fields, and the summary reads them swapped. Assignments to fields that the summary does not read do not matter, unless they call a function, which could fail the pipeline. A computed value for a field that the summary reads, such as `ip = src_ip.string()`, an assignment of anything but a record literal to `this`, and every other operator, including [`head`](https://tenzir.com/docs/reference/operators/head.md) and a [`where`](https://tenzir.com/docs/reference/operators/where.md) that stays in Tenzir, keep the summary in Tenzir.

If the source finds out only when it runs that it cannot compute the summary, for example because a column has a type that the database aggregates differently, it reads the rows and runs the operators between the source and the summary and the original `summarize` on them. The result is the same either way, except that Tenzir does not warn about values of rows that it never sees.

[`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md), [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md), [`from_microsoft_sql`](https://tenzir.com/docs/reference/operators/from_microsoft_sql.md), and [`from_mysql`](https://tenzir.com/docs/reference/operators/from_mysql.md) compute summaries with group keys, `count`, `min`, and `max`. The pages on [ClickHouse](optimizations/clickhouse.md#aggregations), [DuckDB](optimizations/duckdb.md#aggregations), [MySQL](optimizations/mysql.md#aggregations), and [SQL Server](optimizations/microsoft-sql.md#aggregations) list the details.

[`from_sentinelone_data_lake`](https://tenzir.com/docs/reference/operators/from_sentinelone_data_lake.md) computes summaries with group keys and `count()` in SentinelOne when no filter restricts the events of its time window. Tenzir checks each result and summarizes the events itself when SentinelOne might group differently. The [SentinelOne page](optimizations/sentinelone.md#aggregations) lists the details. The other sources still aggregate in Tenzir.

## Database sources

The database sources [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md), [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md), [`from_microsoft_sql`](https://tenzir.com/docs/reference/operators/from_microsoft_sql.md), and [`from_mysql`](https://tenzir.com/docs/reference/operators/from_mysql.md) read in one of two modes, and only one of them optimizes:

* In **table mode**, you name a table, as in `from_mysql table="alerts"`. The operator writes the query itself, so it can add the work of the operators that follow it.
* In **SQL mode**, you write the query, as in `from_mysql sql="SELECT …"`. The operator sends it exactly as written, and Tenzir applies the rest of the pipeline to its result. To have the database filter, write the filter into your query.

In table mode, these rules hold for every database:

* **Filters** become a `WHERE` clause. A predicate is split along its `and`s: each part that the database evaluates exactly like Tenzir goes into the query, and the other parts run in Tenzir. An `or` or `not` goes into the query only if all of its operands do. For example, `where (severity > 3 or msg.to_upper() == "X") and source == "fw"` sends `WHERE source = 'fw'` and evaluates the rest in Tenzir.
* **Limits** go into the query only if every predicate before the [`head`](https://tenzir.com/docs/reference/operators/head.md) did, since the database cannot count rows that Tenzir has yet to filter. Otherwise, the operator enforces the limit itself.
* **Projections** narrow the selected columns to those that the pipeline reads, including columns that only a predicate running in Tenzir needs. Fields that the table does not have are left to [`select`](https://tenzir.com/docs/reference/operators/select.md), which fills them with `null`.
* **Live mode**, which polls a table for new rows, carries the `WHERE` clause and the narrowed columns into every poll, but never a limit, since the limit counts events across polls. The operator plans each poll anew, so that columns added to the table while the pipeline runs take part in later polls.

## SentinelOne

[`from_sentinelone_data_lake`](https://tenzir.com/docs/reference/operators/from_sentinelone_data_lake.md) optimizes only when you omit `query`, and it differs from the database sources in two ways:

* **Filters are prefilters.** PowerQuery coerces types and compares values differently from TQL, so a pushed filter may let extra events through. Tenzir therefore evaluates every original predicate as well, including those that the operator sent.
* **Projections choose the retrieval mode.** A finite field list from [`select`](https://tenzir.com/docs/reference/operators/select.md) or a final [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) can use projected PowerQuery (PQ). Whole-event reads use LOG instead of PQ’s default `timestamp` and `message` columns.

Generated TQL reads handle PQ’s 1,000-row cap transparently: a capped response is discarded before emission and retried through paginated LOG queries, unless an unfiltered pushed `head` intentionally requested no more than the cap. Explicit native `query` requests retain capped-result semantics. Our [SentinelOne optimization reference](optimizations/sentinelone.md#limits-and-the-result-cap) explains the fallback and continuation behavior.

## Filters by database

Which filters go into the query depends on how each database compares values:

| Predicate                                | ClickHouse  | DuckDB      | MySQL       | SQL Server  |
| ---------------------------------------- | ----------- | ----------- | ----------- | ----------- |
| Comparisons of integers up to 64 bits    | Yes         | Yes         | Yes         | Yes         |
| Comparisons of floating-point numbers    | Yes         | Yes         | Partly      | Yes         |
| Comparisons of decimals                  | No          | No          | No          | No          |
| Comparisons of strings                   | Yes         | Yes         | Partly      | Partly      |
| Comparisons of `time` values             | Yes         | Yes         | No          | Partly      |
| Comparisons of `ip` values               | Yes         | No          | No          | No          |
| Comparisons of booleans                  | Equality    | Equality    | No          | Equality    |
| `== null` and `!= null`                  | Yes         | Yes         | Yes         | Yes         |
| `in` with a list                         | Yes         | Yes         | Yes         | Yes         |
| `in` with a subnet                       | Yes         | No          | No          | No          |
| Comparisons between two columns          | Yes         | Yes         | Yes         | Yes         |
| Nested fields                            | Yes         | Yes         | No          | No          |
| String functions                         | Yes         | Yes         | Yes         | Yes         |
| String functions with `ignore_case=true` | Approximate | Approximate | Approximate | No          |
| `match_regex`                            | Approximate | Approximate | No          | No          |
| Arithmetic that cannot overflow          | Yes         | Yes         | No          | Yes         |
| `ip` literals against text columns       | Approximate | Approximate | Approximate | Approximate |

String functions are `starts_with`, `ends_with`, `length_bytes`, and substring search with `"needle" in haystack`. *Partly* means that some column types of that kind stay in Tenzir, because the database compares a different value than the one Tenzir reads. The page of each database lists its column types:

* [ClickHouse](optimizations/clickhouse.md)
* [DuckDB](optimizations/duckdb.md)
* [MySQL](optimizations/mysql.md)
* [Microsoft SQL Server](optimizations/microsoft-sql.md)

## Verify an optimization

To see which hints an operator received, print the optimized pipeline:

```sh
tenzir --dump-opt-ir 'from_mysql table="logins" | where user == "admin" | head 10'
```

The operator shows the accepted predicates as `filter`, the limit as `limit`, the projection as `projection`, and a summary that it computes as `aggregation`, and the [`where`](https://tenzir.com/docs/reference/operators/where.md) or [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) that it took over no longer appears. The [compilation output guide](../guides/troubleshooting/inspect-compilation-output.md) explains the format. To see the query that a database source sends, look it up in the database’s own query log.
