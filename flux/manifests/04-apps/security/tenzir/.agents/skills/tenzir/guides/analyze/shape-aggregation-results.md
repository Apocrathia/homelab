---
title: "Shape aggregation results"
canonical: https://tenzir.com/docs/guides/analyze/shape-aggregation-results
source: https://tenzir.com/docs/guides/analyze/shape-aggregation-results.md
section: "Docs"
---

# Shape aggregation results

> This guide shows you how to choose which rows represent an aggregate result. You’ll preserve every event, emit selected checkpoint events, produce compact summaries, and control when each result becomes complete.

This guide shows you how to choose which rows represent an aggregate result. You’ll preserve every event, emit selected checkpoint events, produce compact summaries, and control when each result becomes complete.

## Choose which rows represent a result

The `output` policy determines whether a completed aggregate result replaces, samples, or enriches its input population:

* **`"summary"`** replaces the input events with compact aggregate records.
* **`"trigger"`** keeps one real event to carry a count checkpoint without emitting the other interval events.
* **`"events"`** preserves every input event and attaches the completed aggregate values.

The same input population therefore produces three different result shapes:

Three aggregation flows show original event records becoming a final summary, one checkpoint event, or a set of enriched events. The output policies map to stats, streamstats checkpoints, and eventstats.

Final and processing-time boundaries use `summary` by default. Count boundaries use `trigger` by default. The current implementation supports `events` only at the final input boundary. See the [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) reference for the complete option matrix.

## Add running statistics to events

Choose between incremental aggregation and a bounded trailing window based on whether old events must expire from the result.

Use cumulative event emission from [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) for unbounded running aggregates. It preserves each event and updates compact aggregate state:

```tql
from {user: "alice", bytes: 10},
     {user: "bob", bytes: 5},
     {user: "alice", bytes: 20}
summarize running_bytes=sum(bytes), events=count(), user,
  options={mode: "cumulative"}
```

```tql
{user: "alice", bytes: 10, running_bytes: 10, events: 1}
{user: "bob", bytes: 5, running_bytes: 5, events: 1}
{user: "alice", bytes: 20, running_bytes: 30, events: 2}
```

This corresponds to Splunk `streamstats` without `window` or `time_window`:

```spl
... | streamstats sum(bytes) AS running_bytes count AS events BY user
```

With the default per-event cadence, `options={mode: "reset"}` calculates the aggregate fields from each input event independently. For example, `sum(bytes)` contains the current event’s `bytes` value instead of a running total. At a one-event boundary, `trigger` already preserves every input event and therefore has the same row-level result as `events`; the shorthand uses `trigger`. It treats grouping fields only as state keys, emits nothing for empty input, and doesn’t add a duplicate summary when the input ends.

### Emit checkpoint events

Use `trigger` to downsample a stream while retaining one real event as the carrier for interval or cumulative statistics. This example emits the third event with statistics for the first three events, then emits the final event with statistics for the partial interval:

```tql
from {seq: 1, bytes: 10},
     {seq: 2, bytes: 20},
     {seq: 3, bytes: 30},
     {seq: 4, bytes: 40},
     {seq: 5, bytes: 50}
summarize batch_events=count(), batch_bytes=sum(bytes),
  options={emit: 3, mode: "reset", output: "trigger"}
```

```tql
{seq: 3, bytes: 30, batch_events: 3, batch_bytes: 60}
{seq: 5, bytes: 50, batch_events: 2, batch_bytes: 90}
```

The output keeps the checkpoint event’s timestamp, source metadata, and other fields without buffering or replaying the preceding events. Use `summary` instead when you only need aggregate records. Use `events` when every event must carry the completed statistics.

The count applies to the entire input of one `summarize` instance, not to each grouping key. With grouping fields, only the triggering event’s group appears in the output, and reset mode clears the other groups at the same boundary. Put `summarize` inside an outer `group` subpipeline when each key needs an independent count and checkpoint.

Use a trailing [`window`](https://tenzir.com/docs/reference/operators/window.md) when only a bounded count or time horizon should contribute. By default, a trailing window runs an arbitrary subpipeline once per input event and exposes that event as `$window.event`:

```tql
from {user: "alice", ts: 2024-01-01T10:00:00Z, bytes: 10},
     {user: "alice", ts: 2024-01-01T10:01:00Z, bytes: 20},
     {user: "bob", ts: 2024-01-01T10:02:00Z, bytes: 5}
group user {
  window size=5min, trailing=true, on=ts, tolerance=30s {
    summarize rolling_bytes=sum(bytes), events=count()
    this = {
      ...$window.event,
      rolling_bytes: rolling_bytes,
      events: events,
    }
  }
}
```

Keep trailing history keyed

The outer `group` is intentional. Each event enters one user subpipeline, so the trailing window replays only that user’s retained history. Moving `group` inside the trailing window would replay the stream-wide history for every event and could emit one result for every user in that history. The recommendation to put `window` outside `group` applies to fixed windows that should share one stream clock, not to keyed trailing windows.

This form corresponds to Splunk `streamstats time_window=5m ... BY user`. The `tolerance` buffers slightly out-of-order events and evaluates them in event-time order. Events that arrive later than the tolerance are dropped with a warning. The reorder buffer can retain up to `tolerance` worth of events in addition to the five-minute trailing history.

Use `size=100, trailing=true` for the count-based equivalent of `streamstats window=100`. Generic trailing windows replay their retained history for every invocation, so prefer incremental `summarize` when you don’t need a bounded horizon or arbitrary subpipeline logic.

Set `every` to evaluate retained history less frequently. For example, `window size=10_000, every=100, trailing=true` evaluates the latest 10,000 events after every 100 inputs. Unlike event-count emission from `summarize`, a trailing `window` doesn’t fire a final partial cadence when its input ends.

A `summarize` without options emits one final result from each trailing window. If you also set `options.emit`, that inner cadence starts fresh for every window invocation and can emit multiple prefix results while consuming the replayed history. Leave `options.emit` unset when you want one result per `window` cadence.

## Add final statistics to every event

Use `output: "events"` when every event needs aggregate values from its complete finite population. Unlike running statistics, all events in one group receive the same final values:

```tql
from {user: "alice", value: 10},
     {user: "alice", value: 20},
     {user: "bob", value: 5}
summarize user, avg=mean(value), samples=count(),
  options={output: "events"}
```

```tql
{user: "alice", value: 10, avg: 15.0, samples: 2}
{user: "alice", value: 20, avg: 15.0, samples: 2}
{user: "bob", value: 5, avg: 5.0, samples: 1}
```

This corresponds to Splunk `eventstats`. At the top level, `summarize` must buffer the complete finite input before it can emit these events. Compose it with `window` to define smaller count, processing-time, or event-time populations and bound the buffered events:

```tql
from {user: "alice", value: 10},
     {user: "alice", value: 20},
     {user: "bob", value: 5}
window size=100 {
  summarize avg=mean(value), samples=count(),
    options={output: "events"}
}
```

Each event is emitted exactly once per window invocation. The current implementation doesn’t combine `output: "events"` directly with a count or duration `emit` value; the outer window supplies the finite boundary.

## Emit processing-time summaries

Set `emit` to a duration and choose `"reset"` or `"cumulative"` mode to emit on a processing-time cadence. Reset mode reports only events received since the previous boundary:

```tql
from {src_ip: 192.0.2.1}, {src_ip: 192.0.2.1}, {src_ip: 192.0.2.2}
summarize src_ip, events=count(), options={emit: 30s, mode: "reset"}
```

Cumulative mode retains state and reports the total so far:

```tql
from {src_ip: 192.0.2.1}, {src_ip: 192.0.2.1}, {src_ip: 192.0.2.2}
summarize src_ip, events=count(), options={emit: 30s, mode: "cumulative"}
```

Both forms emit a final partial summary when the input ends. They differ from [`window`](https://tenzir.com/docs/reference/operators/window.md) because arrival time, not an event timestamp, determines the boundary.

## Aggregate periodic snapshots

Use [`every`](https://tenzir.com/docs/reference/operators/every.md) when the aggregation is tied to a wall-clock schedule, such as polling an inventory API every 10 minutes and publishing a current count of endpoint states. This pattern works well for dashboards, reports, cache refreshes, and external API polling where each run describes the current snapshot.

Don’t use [`every`](https://tenzir.com/docs/reference/operators/every.md) for streaming detections where delayed or out-of-order events can change the answer. Use [`window`](https://tenzir.com/docs/reference/operators/window.md) for event-time detections.

```tql
every 10min {
  from {host: "laptop-1", status: "healthy"},
       {host: "server-1", status: "healthy"},
       {host: "laptop-2", status: "stale"}
  summarize status, endpoint_count=count()
  snapshot_time = now()
}
head 2
sort status
```

Each run fetches a fresh snapshot, groups endpoints by current status, and adds the run time. The `from` block stands in for an inventory API response; in a long-running pipeline, replace it with [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md), remove [`head`](https://tenzir.com/docs/reference/operators/head.md), and publish the compact summary to a channel or destination.

The wall-clock schedule is not an event-time window. If the pipeline starts at 09:00, [`every`](https://tenzir.com/docs/reference/operators/every.md) runs the subpipeline for `[09:00, 09:10)`, then restarts it for `[09:10, 09:20)`, and so on. The boundaries depend on when the pipeline starts, not on timestamps in the fetched data.

## See also

* [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md)
* [`every`](https://tenzir.com/docs/reference/operators/every.md)
* [Aggregate event streams](aggregate-event-streams.md)
* [Window event streams](window-event-streams.md)
