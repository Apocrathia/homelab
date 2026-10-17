---
title: "SentinelOne"
canonical: https://tenzir.com/docs/reference/optimizations/sentinelone
source: https://tenzir.com/docs/reference/optimizations/sentinelone.md
section: "Docs"
---

# SentinelOne

> When you omit query, fromsentinelonedatalake uses the operators that follow it to narrow the search window, send safe prefilters, and choose how to retrieve events. You express the result you want in TQL; there is no retrieval mode flag or separate schema-discovery step.

When you omit `query`, [`from_sentinelone_data_lake`](https://tenzir.com/docs/reference/operators/from_sentinelone_data_lake.md) uses the operators that follow it to narrow the search window, send safe prefilters, and choose how to retrieve events. You express the result you want in TQL; there is no retrieval mode flag or separate schema-discovery step.

Our [optimizations overview](../optimizations.md) explains how Tenzir optimizes pipelines in general.

## When it applies

* **TQL mode** applies when you omit `query`. The operator chooses between complete-event log search (LOG) and projected PowerQuery (PQ).
* **PowerQuery mode** applies when you provide `query`. Your query and its time window stay unchanged. Tenzir applies downstream operators to the native result, without switching to LOG or paginating it. Rewriting a native query could move filtering before its result cap and select different rows.

In TQL mode, at least one supported prefilter, inferred time bound, pushable limit, or explicit `start` or `end` must constrain the request. Otherwise the operator reports an error before contacting SentinelOne. For example, a bare source or a local-only `match_regex` filter followed by [`head`](https://tenzir.com/docs/reference/operators/head.md) cannot supply such a constraint. Add a time window for local-only searches.

## Complete events or selected columns

A filter does not restrict the output schema. Neither do timestamp bounds nor [`head`](https://tenzir.com/docs/reference/operators/head.md). This exploratory pipeline retrieves complete parsed events, including fields that it never names:

```tql
from_sentinelone_data_lake "https://<tenant>.sentinelone.net",
  token=secret("sentinelone-console-token")
where timestamp >= 2024-01-01 and timestamp < 2024-01-02
where event.type == "DNS Resolved"
head 100
```

The operator uses LOG, returns the attributes in each match’s `values` object, and adds the match’s `timestamp`, `severity`, and `threadId` metadata. Dotted attribute names become nested records. Fields such as `event.dns.request` and `event.dns.response` remain available without an explicit `select`. Pagination cursors are transport metadata, not output fields.

A restrictive projection can use PQ to transfer fewer fields. For example:

```tql
from_sentinelone_data_lake "https://<tenant>.sentinelone.net",
  token=secret("sentinelone-console-token")
where timestamp >= 2024-01-01 and timestamp < 2024-01-02
where event.type == "DNS Resolved" and src.ip.match_regex("^10\\.")
select event.type, account.id
```

The initial PQ request is:

```text
| filter ((event.type) == ("DNS Resolved"))
| columns timestamp, event.type, src.ip, account.id
```

The regular expression stays local. Its field is requested along with the selected fields so Tenzir can evaluate it. The `columns` stage always requests `timestamp`; without an explicit column list, PQ normally returns only `timestamp` and `message`.

The operator uses LOG instead when it cannot enumerate a complete, valid column list. Examples include:

* Whole-event inspection, such as `"event_id" in this.keys()`.
* Dynamic indexing, such as `this[key] == 1`.
* A whole record and one of its children, such as `where event.type == "DNS Resolved" | select event`.
* Field names that cannot be rendered safely in PQ, or a column list that reaches the query-size budget.

A finite path alone does not prove that a field is a scalar. SentinelOne stores children under dotted names: `columns event` does not fetch `event.type`. If a projected PQ response contains null or structured cells, the operator discards that response and retries the same window through LOG before emitting events. This also handles `select event` without a predicate naming its children. Legitimately absent or nullable fields can therefore cost an additional request. Select known scalar leaf fields when you want the most efficient projected read.

Both retrieval paths preserve the `raw` setting. It disables string inference, not dotted-name reconstruction or timestamp-metadata conversion.

## Aggregations

When a [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) follows the operator and no [`where`](https://tenzir.com/docs/reference/operators/where.md) restricts the events, SentinelOne computes the summary in a PowerQuery `group` stage and returns one row per group instead of every event of the time window. This also applies to [`top`](https://tenzir.com/docs/reference/operators/top.md) and [`rare`](https://tenzir.com/docs/reference/operators/rare.md), which count with `summarize`. For example, the pipeline

```tql
from_sentinelone_data_lake "https://<tenant>.sentinelone.net",
  token=secret("sentinelone-console-token"),
  start=2024-01-01, end=2024-01-02
summarize event.type, n=count()
```

sends the PowerQuery

```text
| group __tenzir_aggregate_1 = count(), __tenzir_aggregate_2 = count() by __tenzir_aggregate_0 = event.type | limit 100000
```

Tenzir then arranges the result columns into the fields of the summary. The last count is the number of events per group, which Tenzir needs to check the result. SentinelOne computes these parts of a summary:

* Group keys on fields, except `timestamp`.
* `count()`.

The summary may also follow [`select`](https://tenzir.com/docs/reference/operators/select.md), [`drop`](https://tenzir.com/docs/reference/operators/drop.md), [`set`](https://tenzir.com/docs/reference/operators/set.md), and assignments that keep or copy the fields that it reads, as [Aggregations in the source](../optimizations.md#aggregations-in-the-source) describes. SentinelOne then reads the original fields, and the result keeps the new names. For example, `select kind=event.type` followed by `summarize kind, n=count()` groups by `event.type` and returns the field `kind`. A computed value for a field that the summary reads, such as `kind = event.type.to_lower()` before `summarize kind`, keeps the summary in Tenzir.

Every other summary runs in Tenzir, which reads the events as described in [aggregation input columns](sentinelone.md#aggregation-input-columns):

* A summary with another function, including `count(x)`, `min`, and `max`. A field that is missing in SentinelOne can be a record in Tenzir, whose fields exist, and the numeric result types of PowerQuery are unverified.
* A summary after a [`where`](https://tenzir.com/docs/reference/operators/where.md), because [filters are prefilters](sentinelone.md#filters-are-prefilters) that may let extra events through. This includes a [`where`](https://tenzir.com/docs/reference/operators/where.md) on `timestamp`: use `start` and `end` to choose the window instead.
* A summary of an explicit `query`, whose result stays opaque.
* A summary behind an operator that computes a field that the summary reads or that changes the events, such as [`head`](https://tenzir.com/docs/reference/operators/head.md).

PowerQuery groups events without the group key as `null`. For a single group key, Tenzir then reads just these events, with the initial filter `!(event.type = *)` for the example above, and accepts the result only if they add up to the `null` group and Tenzir reads their key as `null` too. Tenzir sees a record instead where an event has fields below the key, such as `endpoint.name` for the key `endpoint`, which PowerQuery has no field for.

Since PowerQuery does not group exactly like Tenzir, Tenzir checks every result before it emits it. It reads the events and summarizes them itself, with the same result, if:

* The groups do not contain every event of the window, according to the `matchCount` of the response. A result that hits the row limit or SentinelOne’s memory limit for groups misses events.
* The events without the group key have a value in Tenzir, do not add up to the `null` group, or exceed 10,000 events. With several group keys, any `null` key falls back as well.
* A group key is a floating-point number or not a single value, since `NaN` and `-0.0` need not group as in Tenzir.
* Type inference makes two group keys equal, such as the text `"true"` and the boolean `true`, which PowerQuery groups apart. With `raw=true`, they stay apart in Tenzir as well.
* SentinelOne rejects the query or reports omitted events.

PowerQuery groups text by its characters, so `Critical` and `CRITICAL` form two groups, as in Tenzir. Without group keys, the summary has one row, also for an empty window. The groups arrive in the order in which SentinelOne returns them. Use [`sort`](https://tenzir.com/docs/reference/operators/sort.md) when you need a particular order. Operators after the summary, such as [`sort`](https://tenzir.com/docs/reference/operators/sort.md) and [`head`](https://tenzir.com/docs/reference/operators/head.md), run in Tenzir.

## Aggregation input columns

When Tenzir computes the summary, [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) requests a finite set of input fields without an explicit [`select`](https://tenzir.com/docs/reference/operators/select.md):

```tql
from_sentinelone_data_lake "https://<tenant>.sentinelone.net",
  token=secret("sentinelone-console-token"),
  account_ids=["<account-id>"],
  start=2024-01-01, end=2024-01-02
where dataSource.name == "SentinelOne"
summarize event.type, n=count()
head 10
```

The initial PQ request is:

```text
| filter ((dataSource.name) == ("SentinelOne")) | columns timestamp, dataSource.name, event.type
```

The count and grouping run in Tenzir. The query contains no `limit` stage: [`head`](https://tenzir.com/docs/reference/operators/head.md) limits summary rows, not contributing events.

The [result-cap fallback and LOG continuation](sentinelone.md#limits-and-the-result-cap) still retrieve the complete input, even when you request only a few summary rows. Whole-event or dynamic aggregate arguments require complete events instead. Our [shared aggregation projection rules](../optimizations.md#aggregation-input-projections) describe the other dependencies and barriers; [`top`](https://tenzir.com/docs/reference/operators/top.md) and [`rare`](https://tenzir.com/docs/reference/operators/rare.md) inherit these rules. Explicit native `query` requests remain unchanged.

## Filters are prefilters

Remote predicates must retain every possible TQL match, but may return extra candidates. For example, SentinelOne may coerce the string `"42"` to match the number `42`. Tenzir evaluates every original [`where`](https://tenzir.com/docs/reference/operators/where.md) predicate locally, including the predicates sent remotely.

A predicate splits at `and`: supported parts run remotely, and the rest run only in Tenzir. An `or` runs remotely only if all its operands translate safely. For example, `where (severity > 3 or msg.match_regex("x")) and source == "fw"` sends `((source) == ("fw"))` as a LOG initial-search filter or a PQ `filter` stage. Unsupported predicates never cause their required fields to disappear.

### Filters that SentinelOne evaluates

* Equality with string, boolean, and numeric literals.
* Membership with `in` and a non-empty list of those literals without `null`.
* Ordering comparisons with numbers or ASCII string bounds.
* `starts_with`, `ends_with`, and substring search with `"needle" in haystack`, using non-empty string literals and without `ignore_case=true`.
* The boolean operators `and` and `or`.

### Filters that stay in Tenzir

* Negation, inequality, and null checks.
* Regular expressions, IP and subnet comparisons.
* Arithmetic, conditionals, and other functions.
* Comparisons between two fields.
* String literals containing control characters and integers beyond ±2^53.
* Whole-event inspection and dynamic indexing.

Presence checks stay local because `event != null` can refer to a record reconstructed from `event.type`. A remote flat-field check such as `event = *` would incorrectly exclude that event.

## Predicate spelling

LOG initial-search filters and PQ `filter` stages use the same tested predicate spellings:

| TQL                  | Remote predicate                       | Reason                                             |
| -------------------- | -------------------------------------- | -------------------------------------------------- |
| `x == "a"`           | `(x) == ("a")`                         | Parentheses avoid precedence surprises.            |
| `x.starts_with("a")` | `(x) starts_with:matchcase("a")`       | Explicit case-sensitive matching.                  |
| `x.ends_with("a")`   | `(x) ends_with:matchcase("a")`         | Explicit case-sensitive matching.                  |
| `"a" in x`           | `(x) contains:matchcase("a")`          | Explicit case-sensitive matching.                  |
| `x == true`, or `x`  | `((x) == (true)) or ((x) == ("true"))` | Tenzir can infer the string `"true"` as a boolean. |
| `x in [1, true]`     | `(x) in (1, true, "true")`             | Include the inferred boolean representation.       |
| `a and b`, `a or b`  | `(a) and (b)`, `(a) or (b)`            | Preserve grouping.                                 |

A bare field name searches full text instead of testing a boolean. Remote string ordering uses UTF-16 code units instead of TQL’s UTF-8 bytes, so only ASCII bounds are pushed. LOG uses an empty search filter when the time window alone constrains the request; it does not accept PQ’s constant-true filter.

## Time window

Comparisons of `timestamp` with time literals or bound `let` values supply missing request bounds, including historical windows outside the default past 24 hours. Bind relative times with `let`, as in `let $end = now()`.

Inferred bounds round outward to whole milliseconds and never widen explicit `start` or `end` arguments. An `or` of time ranges searches their enclosing range. Local evaluation preserves exact precision and inclusivity. A narrowed window that cannot contain an event completes without sending a request.

## Limits and the result cap

A [`head`](https://tenzir.com/docs/reference/operators/head.md) counts events **after local filtering**. LOG continues fetching candidate pages until the limit is satisfied or the search is exhausted; a page with no local matches does not end the read.

LOG requests at most 1,000 candidates per page. A full page continues by launching a new query with the last match’s cursor in `log.cursor`. Continuation includes the boundary match: the operator verifies and removes that one duplicate. It does not advance by timestamp, so distinct events with identical timestamps are retained. A short page ends the read; `estimatedMatchCount` is not used as an exact count.

PQ normally caps ungrouped results at 1,000 rows. A generated PQ response at that cap switches to LOG before emitting anything, unless an unfiltered pushed `head` intentionally requested no more than the cap. An unfiltered `head` can also become a PQ `limit` stage. These rules avoid silently stopping a TQL-generated read at PQ’s default candidate cap.

Explicit `query` requests retain native capped-result semantics. They do not use this continuation or fallback.

The total `timeout` covers all requests, including a PQ-to-LOG fallback, LOG pages, and retries. Earlier LOG pages may already have been emitted when a later page fails or times out. Treat that run as incomplete. Result ordering is not guaranteed; different retrieval paths can return different orders. Pages are separate queries, not a snapshot of a changing data lake.

For generated reads, explicit API omission counters or time-limit indicators also trigger a PQ-to-LOG fallback. If a LOG response reports those omissions, the read fails instead of presenting that page as complete. Unreported API-side omissions cannot be detected. Explicit native queries retain their existing behavior for these indicators.

## Query size

Generated query text is limited to 10,000 bytes. For PQ, required columns take precedence over prefilters. Oversized predicates stay local, while later, smaller predicates can still contribute. An oversized required column list selects LOG instead of dropping fields.

If SentinelOne rejects a generated query, the operator fails. It does not recover from a parser error by launching an unrestricted scan. Only a rejected aggregate query falls back to reading the events of its window, which Tenzir then summarizes.

## Verify an optimization

Print the optimized pipeline to inspect the hints received by the source:

```sh
tenzir --dump-opt-ir 'from_sentinelone_data_lake "https://<tenant>.sentinelone.net", token=secret("s1") | where event.type == "DNS Resolved" | head 10'
```

The source shows predicates as `filter`, the limit as `limit`, field requirements as `projection`, and a summary that SentinelOne computes as `aggregation`. Startup planning chooses LOG or PQ, and Tenzir rechecks the complete filter chain.
