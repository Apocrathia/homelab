---
title: "reorder"
canonical: https://tenzir.com/docs/reference/operators/reorder
source: https://tenzir.com/docs/reference/operators/reorder.md
section: "Docs"
---

# reorder

> Orders events by timestamp while accepting bounded event-time disorder.

Orders events by timestamp while accepting bounded event-time disorder.

```tql
reorder on=expression, tolerance=duration
```

## Description

The `reorder` operator buffers events until their order is stable according to an event-time watermark. Use [`sort`](https://tenzir.com/docs/reference/operators/sort.md) instead when finite input requires a complete order without a known bound on timestamp regressions.

The operator changes event order without changing timestamps or pacing the output. Use [`timeshift`](https://tenzir.com/docs/reference/operators/timeshift.md) to change timestamps and [`delay`](https://tenzir.com/docs/reference/operators/delay.md) to pace events according to their timestamps.

It tracks the largest timestamp observed so far and computes the watermark as:

```text
watermark = largest observed timestamp - tolerance
```

Events at or before the watermark become eligible for output. The operator emits them in ascending timestamp order and preserves their observed arrival order when timestamps are equal.

The `tolerance` bounds the span of event time that the operator buffers, but it doesn’t bound the number of events. Memory use grows with the number of events that remain newer than the watermark. If timestamps stop advancing, the buffered tail remains in memory until event time advances or finite input ends. The operator warns after retaining 100,000 events and doesn’t enforce a hidden event limit.

When finite input ends, `reorder` flushes the remaining buffered events in timestamp order. A live input that becomes idle doesn’t flush its tail.

Events with a null or non-timestamp `on` value are dropped with a warning. An event is late when its timestamp precedes the timestamp of an event that the operator has already emitted. Late events are also dropped with a warning.

A `reorder` instance maintains one global watermark. Put it inside [`group`](https://tenzir.com/docs/reference/operators/group.md) when each key needs independent ordering. For equal timestamps, arrival order means the order observed by `reorder`; the operator cannot reconstruct ordering that an upstream operation already discarded.

### `on = expression`

The expression that supplies each event’s timestamp.

### `tolerance = duration`

The nonnegative amount of event-time disorder to buffer. A tolerance of `0s` emits events immediately and drops timestamp regressions behind emitted output.

## Examples

### Repair bounded event-time disorder

Buffer up to two minutes of event-time disorder before emitting events:

```tql
reorder on=time, tolerance=2min
```

For input timestamps `12:00:00`, `12:02:00`, and `12:01:00`, the operator emits `12:00:00`, `12:01:00`, and `12:02:00`.

### Maintain an independent watermark per user

Put `reorder` inside `group` so activity from one user doesn’t advance another user’s watermark:

```tql
group user.name {
  reorder on=time, tolerance=2min
}
```

### Order events before a fixed window

A fixed [`window`](https://tenzir.com/docs/reference/operators/window.md) delays closure by its tolerance, but it forwards events to its subpipeline in arrival order. Place `reorder` before it when the subpipeline requires timestamp order:

```tql
reorder on=time, tolerance=2min
window size=10min, on=time {
  // The subpipeline receives events in timestamp order.
  …
}
```

Trailing event-time windows already reorder events according to their own `tolerance`, so they don’t need a preceding `reorder` for the same purpose.

## See Also

* [Repair out-of-order events](../../guides/shape/repair-out-of-order-events.md)
* [Replay historical events](../../guides/replay/replay-historical-events.md)
