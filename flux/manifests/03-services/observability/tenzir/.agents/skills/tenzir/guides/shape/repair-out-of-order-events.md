---
title: "Repair out-of-order events"
description: "Restore timestamp order in finite and live event streams without waiting indefinitely for input"
canonical: https://tenzir.com/docs/guides/shape/repair-out-of-order-events
source: https://tenzir.com/docs/guides/shape/repair-out-of-order-events.md
section: "Docs"
---

# Repair out-of-order events

> Restore timestamp order in finite and live event streams without waiting indefinitely for input

Events often arrive in a different order than they occurred. Message-broker partitions, parallel collectors, retries, and batches from independent producers can all introduce timestamp regressions.

Ordering matters when a pipeline compares consecutive observations, collects an activity sequence, calculates inter-arrival times, or replays events at their original cadence. Counts, sums, minima, maxima, and other order-independent calculations usually do not need it.

This guide shows how to choose between [`sort`](https://tenzir.com/docs/reference/operators/sort.md), [`reorder`](https://tenzir.com/docs/reference/operators/reorder.md), and the late-event handling built into [`window`](https://tenzir.com/docs/reference/operators/window.md).

## Start with typed timestamps

The ordering expression must produce a `time` value. Normalize source values before ordering them:

```tql
time = timestamp.time()
```

Follow the guide on [normalizing event timestamps](normalize-event-timestamps.md) when the source uses custom strings, numeric epochs, or incomplete timestamps.

## Choose an ordering strategy

Choose based on whether the input ends and whether you can bound its timestamp skew:

| Input and requirement                                   | Use                                                                                              | Trade-off                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Finite input, arbitrary disorder                        | [`sort`](https://tenzir.com/docs/reference/operators/sort.md)                                    | Waits for all input and holds it in memory.                                           |
| Large or live input, bounded disorder                   | [`reorder`](https://tenzir.com/docs/reference/operators/reorder.md)                              | Adds buffering latency and drops only events whose timestamps precede emitted output. |
| Event-time aggregation without sequence-dependent logic | [`window`](https://tenzir.com/docs/reference/operators/window.md) `tolerance=...`                | Accepts late window members without necessarily reordering them.                      |
| Trailing event-time history                             | [`window`](https://tenzir.com/docs/reference/operators/window.md) `trailing=true, tolerance=...` | Reorders as part of maintaining the trailing history.                                 |

Do not add `reorder` merely because events can arrive late. Add it when a later operator needs chronological input.

## Sort a finite input completely

Use `sort` when input ends and every event must be placed correctly regardless of skew:

```tql
from_file "events.json" {
  read_ndjson
}
sort time
```

The `sort` operator is stable, so events with equal timestamps retain their input order. It buffers the complete input before emitting anything. This is suitable for a small archive or a bounded window, but not for an unending source.

## Repair bounded disorder in a live stream

Use `reorder` when you can state how far timestamps may regress:

```tql
reorder on=time, tolerance=2min
```

The operator tracks the largest timestamp observed and derives a watermark:

```text
watermark = largest observed timestamp - tolerance
```

Events at or before the watermark can no longer be displaced by an event within the accepted tolerance, so `reorder` emits them in ascending timestamp order. Equal timestamps retain their observed arrival order.

For example:

```tql
from {time: 2024-01-01T10:00:00, message: "first"},
     {time: 2024-01-01T10:02:00, message: "third"},
     {time: 2024-01-01T10:01:00, message: "second"}
reorder on=time, tolerance=2min
```

```tql
{time: 2024-01-01T10:00:00Z, message: "first"}
{time: 2024-01-01T10:01:00Z, message: "second"}
{time: 2024-01-01T10:02:00Z, message: "third"}
```

Finite input flushes the remaining buffered events at the end. A live input that becomes idle keeps its newest events buffered until event time advances.

## Choose a tolerance from observed skew

Set `tolerance` from the event-time regressions present in your telemetry, not from ingestion delay, the window size, or an arbitrary round number. Measure each event against the largest timestamp observed up to that point:

```tql
summarize largest_time=max(time), options={mode: "cumulative"}
skew = largest_time - time
summarize events=count(), mean_skew=mean(skew), max_skew=max(skew)
```

For arrivals at `10:00`, `10:02`, and `10:01`, this measures a maximum skew of one minute. The wall-clock ingestion time does not affect the result.

Use a value that covers the regressions the pipeline should accept. Leave room for normal batching and transport jitter, then monitor late-event warnings for exceptions.

A larger tolerance has two direct costs:

* Every event waits longer before becoming eligible for output.
* More events can remain buffered in memory.

The duration bounds event-time span, not event count. A high-volume stream can retain many events within a short tolerance.

## Decide whether ordering is global or per key

One `reorder` instance maintains one watermark. This provides one global order for all events:

```tql
reorder on=time, tolerance=30s
```

A busy producer can advance that watermark far enough to make an event from a quiet producer late. Put `reorder` inside [`group`](https://tenzir.com/docs/reference/operators/group.md) when each source or entity needs an independent clock:

```tql
group device.uid {
  reorder on=time, tolerance=30s
  // Process each device in timestamp order.
  …
}
```

This guarantees order within each group. The merged output of `group` does not form one global timestamp sequence. Use the global form before [`delay`](https://tenzir.com/docs/reference/operators/delay.md) or another operator that consumes one shared timeline.

## Order sequence-dependent processing

### Collect activity in timestamp order

A fixed event-time window uses `tolerance` to keep a window open for late events, but its subpipeline receives events in arrival order. Put `reorder` before it when an order-sensitive aggregate such as [`collect`](https://tenzir.com/docs/reference/functions/collect.md) must see timestamp order:

```tql
reorder on=time, tolerance=30s
window size=5min, on=time {
  summarize sequence=collect(activity_name)
}
```

The fixed window no longer needs its own tolerance because `reorder` emits a nondecreasing stream.

### Replay with the original cadence

The `delay` operator emits a timestamp regression immediately because it cannot sleep backwards. Repair the sequence first:

```tql
reorder on=time, tolerance=2min
delay time, start=now(), speed=20.0
```

The guide on [replaying historical events](../replay/replay-historical-events.md) shows how to combine ordering with timestamp shifting and safe output routing.

## Avoid redundant reordering

A trailing event-time window already reorders events within its own tolerance:

```tql
window size=1h, trailing=true, on=time, tolerance=2min {
  // The subpipeline sees timestamp-ordered history.
  …
}
```

Adding `reorder` with the same timestamp and tolerance before this window adds latency and buffering without changing its event order.

Order-independent fixed-window aggregations also need no standalone reorder. The following count accepts events up to two minutes late without caring about their order inside the window:

```tql
window size=10min, on=time, tolerance=2min {
  summarize count()
}
```

## Handle events outside the contract

The `reorder` operator drops events whose ordering expression is null or not a timestamp. It also drops an event older than output the operator has already emitted. Both cases produce aggregated warnings.

Treat repeated warnings as a contract problem. Normalize the timestamp, raise the tolerance, use separate per-key clocks, or choose a complete `sort` for finite input. The operator warns after retaining 100,000 events but does not impose a hidden event limit.

## See also

* [Normalize event timestamps](normalize-event-timestamps.md)
* [Replay historical events](../replay/replay-historical-events.md)
* [Window event streams](../analyze/window-event-streams.md)
* [Detect over time windows](../detect/detect-over-time-windows.md)
