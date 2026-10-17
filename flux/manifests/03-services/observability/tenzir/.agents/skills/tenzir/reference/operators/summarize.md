---
title: "summarize"
canonical: https://tenzir.com/docs/reference/operators/summarize
source: https://tenzir.com/docs/reference/operators/summarize.md
section: "Docs"
---

# summarize

> Groups events and applies aggregate functions to each group.

Groups events and applies aggregate functions to each group.

```tql
summarize (group|aggregation)..., [options={...}]
```

## Description

The `summarize` operator groups events according to certain fields and applies [aggregation functions](../functions.md#aggregation) to each group. By default, the operator consumes the entire input before producing a final summary and may reorder the event stream.

Set `options` to control three independent aspects of aggregation: `emit` defines when a result becomes complete, `mode` defines which events contribute to the result, and `output` defines which rows represent it. Event-count emission preserves the event that reaches the boundary by default. Final event output preserves every input event and adds the completed aggregate values for its group. Periodic and final summary output produces records that contain only group and aggregate fields.

The order of summary fields follows the sequence of the provided arguments. Aggregate fields are assigned in argument order with the same nested field and collision behavior as normal assignments. Trigger and event output use grouping fields only as state keys. A renamed group such as `key=user` doesn’t add or replace `key` in an enriched event.

Potentially high memory usage

Each group keeps aggregation state until an emission resets it or the pipeline ends. Streams with many unique group keys can therefore consume significant memory.

The `events` output policy currently buffers every input event until the finite input ends. Tenzir warns once the buffered input reaches approximately 512 MiB, but it doesn’t truncate the input or enforce a hidden limit. Use `window` or reduce the input population when you need a memory bound.

### `group`

To group by a certain field, use the syntax `<field>` or `<field>=<field>`. For each unique combination of the `group` fields, a single output event will be returned.

### `aggregation`

The [aggregation functions](../functions.md#aggregation) applied to each group are specified with `f(…)` or `<field>=f(…)`, where `f` is the name of an aggregation function (see below) and `<field>` is an optional name for the result. The aggregation function will produce a single result for each group.

If no name is specified, the aggregation function call will automatically generate one. If processing continues after `summarize`, we strongly recommend to specify a custom name.

### `options`

The optional `options` record separates the emission boundary, aggregation state, and output policy:

| Options                       | Behavior                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| No options or `options={}`    | Emit one final summary when the input ends.                                                                          |
| `mode: "reset"`               | Emit every input event with aggregates for that event.                                                               |
| `mode: "cumulative"`          | Emit every input event with running aggregates.                                                                      |
| `emit: <int>` and `mode`      | Emit the triggering event after the specified number of input events and emit the final event of a partial interval. |
| `emit: <duration>` and `mode` | Emit summaries periodically in processing time and emit a final partial summary.                                     |
| `output: "events"`            | Buffer the finite input, then emit every event with the final aggregates for its group.                              |

Setting a count or duration `emit` value without `mode` produces an error.

#### `emit: int | duration | "final"`

`emit` defines when an aggregate result becomes complete. Set it to `"final"` to wait until the input ends and produce one completed result. On an unbounded stream, this boundary doesn’t occur unless an enclosing operator such as `window` supplies a finite input.

Use a positive `int` to emit after a number of input events. Tenzir includes the triggering event in the aggregation, preserves that event, and adds the current aggregate values. For example, `emit: 1` enriches every input event, while `emit: 100` enriches every 100th event. When the input ends before reaching the next boundary, Tenzir enriches and emits the final input event. Empty input produces no output.

Use a positive duration to emit summaries on a processing-time interval. The interval must be at least 10ms. Timer mode emits a final partial summary when the input ends and emits nothing for empty input.

Defaults to `"final"`.

#### `mode: "reset" | "cumulative"`

Choose which events contribute to each result:

* `"reset"`: Clear state at every event-count or timer boundary.
* `"cumulative"`: Retain state and produce running values.

When you specify `mode` without `emit` or `output`, `emit` defaults to `1` to preserve the existing event-by-event shorthand. State mode doesn’t affect a final result because the input has only one boundary.

#### `output: "summary" | "trigger" | "events"`

Choose which rows represent a completed result:

* `"summary"`: Emit one aggregate record per group. Final and duration boundaries use this policy by default. Choose this policy when you need the aggregate results, not the original events.
* `"trigger"`: Enrich only the event that reaches a count boundary. Count boundaries use this policy by default. This treats one real input event as a checkpoint carrying interval or cumulative statistics without replaying the other events.
* `"events"`: Emit every input event exactly once with the final aggregate values for its group. Choose this policy when every original event needs the completed statistics. Empty input produces no output.

The current implementation accepts `summary` at final and duration boundaries, `trigger` at count boundaries, and `events` at the final input boundary. It rejects other combinations. In particular, `events` cannot be combined with a count or duration `emit` value or the legacy `frequency` option.

A count boundary applies to the entire input of one `summarize` instance, not independently to each grouping key. With `trigger`, only the triggering event’s group is represented in the output. In reset mode, state for the other groups is also cleared at that boundary. Put `summarize` inside an outer `group` subpipeline when each key needs an independent count and checkpoint.

Inside [`window`](https://tenzir.com/docs/reference/operators/window.md), the window lifecycle supplies a finite input boundary. Without parallelism, event output preserves the order in which its `summarize` invocation receives events. Outputs from concurrent [`window`](https://tenzir.com/docs/reference/operators/window.md) subpipelines can still interleave, as described in the [`window`](https://tenzir.com/docs/reference/operators/window.md) reference.

### Parallelization

When you enable [parallelism](../../guides/node-setup/tune-performance.md#parallelism), Tenzir can run `summarize` on several cores at once. It partitions the input by the `group` fields so that every event of a group reaches the same instance, which keeps each group’s aggregation state in one place. Because partitioning splits batches, Tenzir runs at most `limit_partitions` instances, four by default.

Two configurations keep `summarize` on a single instance:

* You specify no `group` field. One global aggregation state has to see every event, so replicating the operator would produce a partial result per instance instead of one result.
* You set `emit` to a count greater than `1`. The count applies to the entire input of one instance, so each replica would count only the share of the input it receives.

Every other configuration parallelizes, including `emit: "final"`, `emit: 1`, a duration `emit`, and `output: "events"`. For example, this final aggregation can run one `summarize` instance per hash partition:

```tql
// parallelism: max
from {host: "a", bytes: 10}, {host: "b", bytes: 20}
summarize host, bytes=sum(bytes)
```

A count emission greater than `1` keeps the same pipeline on one `summarize` instance:

```tql
// parallelism: max
from {host: "a", bytes: 10}, {host: "b", bytes: 20}
summarize host, bytes=sum(bytes), options={emit: 2, mode: "reset"}
```

With final or per-event emission, partitioning keeps each group’s complete state on one instance. Parallelism therefore preserves the groups and the values of order-independent aggregates such as [`count`](https://tenzir.com/docs/reference/functions/count.md) and [`min`](https://tenzir.com/docs/reference/functions/min.md). An upstream parallel stage can reorder a group’s events before they reach `summarize`, which can change order-sensitive aggregates such as [`first`](https://tenzir.com/docs/reference/functions/first.md), [`last`](https://tenzir.com/docs/reference/functions/last.md), and [`collect`](https://tenzir.com/docs/reference/functions/collect.md).

With duration-based emission, each replica maintains its own timer. Parallelism can therefore change the number and aggregate values of periodic summaries, especially when aggregates reset after emission. Parallelism can also change the output order.

Parallel instances emit events out of order

Instances work at different speeds, and each one emits the groups it owns as it completes them. With `output: "events"` or `output: "trigger"`, output from the instances can interleave instead of following input order. Use [`sort`](https://tenzir.com/docs/reference/operators/sort.md) on an ordering field, or keep parallelism disabled, when the order carries meaning.

Parallel instances keep independent timers

A duration `emit` measures processing time per instance, and an instance starts its first interval when it receives its first event. Instances therefore neither start at the same moment nor stay aligned with each other. Every group still receives a complete series of summaries, but summaries of groups that live on different instances can cover different time windows, so their values aren’t comparable across groups.

Use [`window`](https://tenzir.com/docs/reference/operators/window.md) when the intervals have to line up. Its fixed windows align to the Unix epoch rather than to the arrival of the first event, so every group shares the same boundaries no matter which instance owns it:

```tql
window size=1h {
  summarize dest_ip, bytes=sum(bytes)
}
```

Keeping parallelism disabled also restores a single timer.

## Optimizations

With final summary output, `summarize` tells projection-capable sources which input fields it needs. For example:

```tql
from_mysql table="events", host="db.example.com", database="soc"
summarize host, events=count(), bytes=sum(bytes)
head 10
```

The source can read only `host` and `bytes`, without an explicit [`select`](https://tenzir.com/docs/reference/operators/select.md). Unless the source computes the aggregation, as described later, aggregation still runs in Tenzir and consumes the complete input. The [`head`](https://tenzir.com/docs/reference/operators/head.md) limits summary rows, not the events contributing to them.

All grouping keys and aggregate inputs remain required, even if a later selection drops their results. An aggregation that reads the whole event or uses dynamic field access prevents narrowing. Trigger output, event output, and periodic summaries retain their optimization barriers. Projection is also withheld while options are unresolved in a runtime-bound subpipeline, such as [`group`](https://tenzir.com/docs/reference/operators/group.md) or [`window`](https://tenzir.com/docs/reference/operators/window.md).

The [`top`](https://tenzir.com/docs/reference/operators/top.md) and [`rare`](https://tenzir.com/docs/reference/operators/rare.md) operators use `summarize` internally and benefit from the same input-field optimization. Our [aggregation input projection reference](../optimizations.md#aggregation-input-projections) explains the generated query and the shared rules across sources.

The database sources [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md), [`from_duckdb`](https://tenzir.com/docs/reference/operators/from_duckdb.md), [`from_microsoft_sql`](https://tenzir.com/docs/reference/operators/from_microsoft_sql.md), and [`from_mysql`](https://tenzir.com/docs/reference/operators/from_mysql.md) compute a final summary that directly follows them in the database, which then returns one row per group. [`from_sentinelone_data_lake`](https://tenzir.com/docs/reference/operators/from_sentinelone_data_lake.md) lets SentinelOne compute such a summary as well. The [optimizations reference](../optimizations.md#aggregations-in-the-source) lists the conditions.

## Examples

### Compute the sum of a field over all events

```tql
from {x: 1}, {x: 2}
summarize x=sum(x)
```

```tql
{x: 3}
```

Group over `y` and compute the sum of `x` for each group:

```tql
from {x: 0, y: 0, z: 1},
     {x: 1, y: 1, z: 2},
     {x: 1, y: 1, z: 3}
summarize y, x=sum(x)
```

```tql
{y: 0, x: 0}
{y: 1, x: 2}
```

### Gather unique values in a list

Group the input by `src_ip` and aggregate all unique `dest_port` values into a list:

```tql
summarize src_ip, distinct(dest_port)
```

Same as above, but produce a count of the unique number of values instead of a list:

```tql
summarize src_ip, count_distinct(dest_port)
```

### Compute min and max of a group

Compute minimum and maximum of the `timestamp` field per `src_ip` group:

```tql
summarize min(timestamp), max(timestamp), src_ip
```

Compute minimum and maximum of the `timestamp` field over all events:

```tql
summarize min(timestamp), max(timestamp)
```

### Check if any value of a group is true

Create a boolean flag `originator` that is `true` if any value in the `src_ip` group is `true`:

```tql
summarize src_ip, originator=any(is_orig)
```

### Create 1-hour time buckets

Create 1-hour groups and produce a summary of network traffic between host pairs:

```tql
ts = round(ts, 1h)
summarize ts, src_ip, dest_ip, sum(bytes_in), sum(bytes_out)
```

### Add running totals to every event

Preserve each event and add a running byte total for its source:

```tql
summarize total_bytes=sum(bytes), src_ip, options={mode: "cumulative"}
```

This behavior corresponds to Splunk’s `streamstats sum(bytes) BY src_ip`. Grouping fields select independent state buckets; they don’t replace or remove fields in the input event.

Use reset mode to compute aggregates from only the current event:

```tql
summarize event_bytes=sum(bytes), options={mode: "reset"}
```

### Add final statistics to every event

Preserve the input and add the final average and sample count for each user:

```tql
from {user: "alice", value: 10},
     {user: "alice", value: 20},
     {user: "bob", value: 5}
summarize user,
          avg=mean(value),
          samples=count(),
          options={output: "events"}
```

```tql
{user: "alice", value: 10, avg: 15.0, samples: 2}
{user: "alice", value: 20, avg: 15.0, samples: 2}
{user: "bob", value: 5, avg: 5.0, samples: 1}
```

This behavior corresponds to Splunk’s `eventstats`. Compose event output with `window` to attach final statistics for each fixed, trailing, count, or event-time window.

### Emit a checkpoint every 100 events

Preserve every 100th event as a checkpoint and add stream-wide running totals:

```tql
summarize events=count(), total_bytes=sum(bytes),
  options={emit: 100, mode: "cumulative", output: "trigger"}
```

The output retains the triggering event’s fields, including its timestamp and source metadata. Only that event represents the checkpoint; the other 99 events aren’t emitted.

### Emit aggregations every 5 seconds

Count events per source IP and emit results every 5 seconds, resetting the count after each emission:

```tql
summarize count(this), src_ip, options={emit: 5s, mode: "reset"}
```

### Emit cumulative totals periodically

Sum bytes and emit running totals every minute:

```tql
summarize sum(bytes), options={emit: 1min, mode: "cumulative"}
```

Timer emission uses processing time. For fixed or hopping event-time ranges, use [`window`](https://tenzir.com/docs/reference/operators/window.md). `summarize` doesn’t keep a bounded trailing history, so a Splunk `streamstats` query with `window` or `time_window` still requires a windowing strategy.

## See Also

* [`group`](https://tenzir.com/docs/reference/operators/group.md)
* [`rare`](https://tenzir.com/docs/reference/operators/rare.md)
* [`top`](https://tenzir.com/docs/reference/operators/top.md)
* [`sum`](https://tenzir.com/docs/reference/functions/sum.md)
* [`count`](https://tenzir.com/docs/reference/functions/count.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
* [Shape aggregation results](../../guides/analyze/shape-aggregation-results.md)
* [Window event streams](../../guides/analyze/window-event-streams.md)
* [Learn idiomatic TQL](../../tutorials/learn-idiomatic-tql.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
