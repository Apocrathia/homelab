---
title: "lag"
canonical: https://tenzir.com/docs/reference/operators/lag
source: https://tenzir.com/docs/reference/operators/lag.md
section: "Docs"
---

# lag

> Adds a preceding value or event to each current event.

Adds a preceding value or event to each current event.

```tql
lag into=field, [value=any], [offset=uint]
```

## Description

The `lag` operator preserves every input event and assigns a preceding value to `into`. It maintains one history for its input stream and retains at most `offset` values.

The first `offset` events receive `null`. Compose `lag` with [`group`](https://tenzir.com/docs/reference/operators/group.md) when you need an independent history for each key:

```tql
group user {
  lag value=location, into=previous_location
}
```

Enclosing operators define the lifetime of the history. For example, placing the group and lag inside a fixed [`window`](https://tenzir.com/docs/reference/operators/window.md) resets every history when the window closes. Without such a boundary, grouped lag retains `offset` values and one subpipeline per key until the input ends. For high-cardinality keys, use a window when its boundaries fit the detection semantics.

The operator follows input order within its pipeline. It doesn’t sort by event time or inspect timestamps. Use [`sort`](https://tenzir.com/docs/reference/operators/sort.md) to order bounded input. For live streams with bounded event-time disorder, put [`reorder`](https://tenzir.com/docs/reference/operators/reorder.md) before `lag`. When using keyed histories, place both operators inside the same group so each key has an independent watermark:

```tql
group user {
  reorder on=time, tolerance=2min
  lag value=location, into=previous_location
}
```

A fixed event-time [`window`](https://tenzir.com/docs/reference/operators/window.md) can bound grouped lag state when its boundaries fit the use case, but its `tolerance` only delays window closure. It doesn’t reorder events before `lag`.

### `value = any` (optional)

The expression to retain and attach to a later event.

Omit `value` to retain the complete event.

### `offset = uint` (optional)

The positive number of preceding events to look back. It defaults to `1`.

The operator retains at most this many values.

### `into = field`

The field that receives the preceding value or `null`. Assignment follows the same field replacement and nested-field behavior as [`set`](https://tenzir.com/docs/reference/operators/set.md).

A `null` result can mean either that no preceding event exists or that the preceding value was itself `null`. Omit `value` to retain the complete event when you need to distinguish these cases: a complete preceding event is only `null` when no predecessor exists.

### Choose between `lag` and `window`

The [`window`](https://tenzir.com/docs/reference/operators/window.md) operator can also express comparisons with preceding events. A trailing count window can retain the current event and its predecessors, then run a subpipeline that selects the event at the required offset. Each invocation then replays the retained complete events through a new subpipeline.

The `lag` operator specializes this positional lookup. It evaluates `value` once per input event, retains only the `offset` evaluated values, and emits each current event once. Use `lag` when you need one value or complete event at a fixed offset. Use a trailing `window` when you need to scan or aggregate a bounded history, reorder event-time input with `tolerance`, or run arbitrary logic over several preceding events. You can also enclose `lag` in a fixed window when the window should reset its state.

## Examples

### Attach a preceding value for each user

Use [`group`](https://tenzir.com/docs/reference/operators/group.md) to keep independent location histories. The final sort only restores the original order for this bounded example; grouped subpipelines do not define an order relative to one another.

```tql
from \
  {sequence: 1, user: "alice", location: "Berlin"},
  {sequence: 2, user: "bob", location: "Paris"},
  {sequence: 3, user: "alice", location: "London"}
group user {
  lag value=location, into=previous_location
}
sort sequence
drop sequence
```

```tql
{user: "alice", location: "Berlin", previous_location: null}
{user: "bob", location: "Paris", previous_location: null}
{user: "alice", location: "London", previous_location: "Berlin"}
```

Set `offset=2` to attach the value from two events earlier within each group.

### Attach the complete preceding event

Omit `value` to retain and attach complete events:

```tql
from {state: "created"}, {state: "running"}, {state: "stopped"}
lag into=previous
```

```tql
{state: "created", previous: null}
{state: "running", previous: {state: "created"}}
{state: "stopped", previous: {state: "running"}}
```

### Combine adjacent values with windows

Use `lag` for the direct predecessor and [`window`](https://tenzir.com/docs/reference/operators/window.md) for bounded aggregates over the enriched stream:

```tql
from {time: 2025-01-01T10:01:00, host: "a", bytes: 15},
     {time: 2025-01-01T10:02:00, host: "b", bytes: 120},
     {time: 2025-01-01T10:00:00, host: "a", bytes: 10},
     {time: 2025-01-01T10:00:30, host: "b", bytes: 100},
     {time: 2025-01-01T10:07:00, host: "a", bytes: 38},
     {time: 2025-01-01T10:06:00, host: "a", bytes: 30}
group host {
  reorder on=time, tolerance=2min
  lag value=bytes, into=previous_bytes
  where previous_bytes != null
  bytes_delta = bytes - previous_bytes
  window size=5min, on=time {
    summarize host, max_delta=max(bytes_delta)
    start = $window.start
    end = $window.end
  }
}
sort host, start
```

```tql
{host: "a", max_delta: 5, start: 2025-01-01T10:00:00Z, end: 2025-01-01T10:05:00Z}
{host: "a", max_delta: 15, start: 2025-01-01T10:05:00Z, end: 2025-01-01T10:10:00Z}
{host: "b", max_delta: 20, start: 2025-01-01T10:00:00Z, end: 2025-01-01T10:05:00Z}
```

The input deliberately places each host’s events out of timestamp order. The `reorder` step repairs that order independently per host before `lag` computes adjacent deltas. The pipeline drops the first event for each host because it has no predecessor. Keeping the window inside the group prevents interleaving between hosts from making an event appear late. The final sort only makes the bounded example’s output deterministic.

## See Also

* [Detect over time windows](../../guides/detect/detect-over-time-windows.md)
* [`reorder`](https://tenzir.com/docs/reference/operators/reorder.md)
