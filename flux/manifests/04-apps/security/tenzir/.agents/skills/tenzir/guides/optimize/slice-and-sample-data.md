---
title: "Slice and sample data"
canonical: https://tenzir.com/docs/guides/optimize/slice-and-sample-data
source: https://tenzir.com/docs/guides/optimize/slice-and-sample-data.md
section: "Docs"
---

# Slice and sample data

> When working with data streams, you often need to control which events flow through your pipeline. This guide shows you how to slice event streams, sample data, and control event ordering using TQL operators.

When working with data streams, you often need to control which events flow through your pipeline. This guide shows you how to slice event streams, sample data, and control event ordering using TQL operators.

## Understanding stream operators

The operators in this guide work on entire event streams:

* [`head`](https://tenzir.com/docs/reference/operators/head.md) and [`tail`](https://tenzir.com/docs/reference/operators/tail.md) - Get events from the beginning or end
* [`slice`](https://tenzir.com/docs/reference/operators/slice.md) - Extract a specific range of events
* [`taste`](https://tenzir.com/docs/reference/operators/taste.md) - Sample events by schema
* [`reverse`](https://tenzir.com/docs/reference/operators/reverse.md) - Invert the order of events
* [`sample`](https://tenzir.com/docs/reference/operators/sample.md) - Randomly sample events

These operators maintain state between events, unlike functions that work on individual values.

## Get events from the beginning

Use the [`head`](https://tenzir.com/docs/reference/operators/head.md) operator to get the first N events from a stream.

### Basic usage

Get the first 3 events:

```tql
from {id: 1, value: "a"},
     {id: 2, value: "b"},
     {id: 3, value: "c"},
     {id: 4, value: "d"},
     {id: 5, value: "e"}
head 3
```

```tql
{id: 1, value: "a"}
{id: 2, value: "b"}
{id: 3, value: "c"}
```

### Default behavior

Without an argument, [`head`](https://tenzir.com/docs/reference/operators/head.md) returns all events:

```tql
from {id: 1, value: "first"},
     {id: 2, value: "second"},
     {id: 3, value: "third"}
head
```

```tql
{id: 1, value: "first"}
{id: 2, value: "second"}
{id: 3, value: "third"}
```

## Get events from the end

Use the [`tail`](https://tenzir.com/docs/reference/operators/tail.md) operator to get the last N events.

### Basic usage

Get the last 2 events:

```tql
from {id: 1, value: "a"},
     {id: 2, value: "b"},
     {id: 3, value: "c"},
     {id: 4, value: "d"}
tail 2
```

```tql
{id: 3, value: "c"}
{id: 4, value: "d"}
```

Performance consideration

The [`tail`](https://tenzir.com/docs/reference/operators/tail.md) operator must consume all input before producing output, making it memory-intensive for large streams. Use [`head`](https://tenzir.com/docs/reference/operators/head.md) when possible for better performance.

## Slice event streams

The [`slice`](https://tenzir.com/docs/reference/operators/slice.md) operator provides fine-grained control over which events to extract.

### Extract a range

Get events 2 through 4 (0-indexed):

```tql
from {n: 1}, {n: 2}, {n: 3}, {n: 4}, {n: 5}
slice begin=1, end=4
```

```tql
{n: 2}
{n: 3}
{n: 4}
```

### Skip events with stride

Get every other event starting from the second:

```tql
from {n: 1}, {n: 2}, {n: 3}, {n: 4}, {n: 5}, {n: 6}
slice begin=1, stride=2
```

```tql
{n: 2}
{n: 4}
{n: 6}
```

### Combine parameters

Skip 2, take every 3rd event, stop after 10 total:

```tql
from {n: 1}, {n: 2}, {n: 3}, {n: 4}, {n: 5},
     {n: 6}, {n: 7}, {n: 8}, {n: 9}, {n: 10}
slice begin=2, end=10, stride=3
```

```tql
{n: 3}
{n: 6}
{n: 9}
```

## Sample events by schema

The [`taste`](https://tenzir.com/docs/reference/operators/taste.md) operator samples events based on their structure, giving you examples of different data shapes in your stream.

### Get schema examples

See one example of each unique schema:

```tql
from {type: "user", name: "alice"},
     {type: "user", name: "bob"},
     {type: "event", id: 1},
     {type: "event", id: 2},
     {value: 42}
taste 1
```

```tql
{type: "user", name: "alice"}
{type: "event", id: 1}
{value: 42}
```

### Get multiple examples per schema

Get up to 2 examples of each schema:

```tql
from {x: 1, y: 1},
     {x: 2, y: 2},
     {x: 3},
     {x: 4},
     {z: "a"},
     {z: "b"}
taste 2
```

```tql
{x: 1, y: 1}
{x: 2, y: 2}
{x: 3}
{x: 4}
{z: "a"}
{z: "b"}
```

## Reverse event order

Use the [`reverse`](https://tenzir.com/docs/reference/operators/reverse.md) operator to invert the order of events in a stream:

```tql
from {seq: 1, msg: "first"},
     {seq: 2, msg: "second"},
     {seq: 3, msg: "third"}
reverse
```

```tql
{seq: 3, msg: "third"}
{seq: 2, msg: "second"}
{seq: 1, msg: "first"}
```

Memory usage

Like [`tail`](https://tenzir.com/docs/reference/operators/tail.md), the [`reverse`](https://tenzir.com/docs/reference/operators/reverse.md) operator must buffer all input before producing output. Use with caution on large streams.

## Time-based sampling

Use the [`sample`](https://tenzir.com/docs/reference/operators/sample.md) operator to sample events based on time intervals:

### Sample by duration

Sample events at regular time intervals:

```tql
from {id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5},
     {id: 6}, {id: 7}, {id: 8}, {id: 9}, {id: 10}
sample 1s
```

```tql
{id: 1}
{id: 2}
{id: 3}
{id: 4}
{id: 5}
{id: 6}
{id: 7}
{id: 8}
{id: 9}
{id: 10}
```

Note: The sample operator uses duration-based sampling, not random probability sampling.

## Combining operators

Chain operators to create more complex sampling strategies:

```tql
from {user: "alice", action: "login", time: 1},
     {user: "bob", action: "view", time: 2},
     {user: "alice", action: "edit", time: 3},
     {user: "charlie", action: "login", time: 4},
     {user: "bob", action: "logout", time: 5}
where action == "login"
head 2
```

```tql
{user: "alice", action: "login", time: 1}
{user: "charlie", action: "login", time: 4}
```

## Best practices

1. **Prefer `head` over `tail`**: [`head`](https://tenzir.com/docs/reference/operators/head.md) stops processing once it has enough events, while [`tail`](https://tenzir.com/docs/reference/operators/tail.md) must process everything.
2. **Use `taste` for exploration**: When working with unfamiliar data, [`taste`](https://tenzir.com/docs/reference/operators/taste.md) quickly shows you the different schemas present.
3. **Be mindful of memory**: Operators like [`tail`](https://tenzir.com/docs/reference/operators/tail.md) and [`reverse`](https://tenzir.com/docs/reference/operators/reverse.md) buffer all input, which can consume significant memory for large streams.
4. **Combine with filters**: Use [`where`](https://tenzir.com/docs/reference/operators/where.md) before slicing operators to reduce the amount of data processed.

## See also

* [Filter and select data](filter-and-select-data.md)
* [Deduplicate events](deduplicate-events.md)
* [Aggregate event streams](../analyze/aggregate-event-streams.md)
