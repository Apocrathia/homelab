---
title: "rare"
canonical: https://tenzir.com/docs/reference/operators/rare
source: https://tenzir.com/docs/reference/operators/rare.md
section: "Docs"
---

# rare

> Shows the least common values.

Shows the least common values.

```tql
rare x:field
```

## Description

Shows the least common values for a given field. For each unique value, a new event containing its count will be produced. In general, `rare x` is equivalent to:

This operator is the dual to [`top`](https://tenzir.com/docs/reference/operators/top.md).

```tql
summarize x, count=count()
sort count
```

Potentially High Memory Usage

Use caution when applying this operator to large inputs. It currently buffers aggregation state in memory. A downstream [`head`](https://tenzir.com/docs/reference/operators/head.md) bounds the final sort’s retained candidates, but does not reduce the number of aggregation groups. Out-of-core processing is on our roadmap.

### `x: field`

The name of the field to find the least common values for.

## Examples

### Find the least common values

```tql
from {x: "B"}, {x: "A"}, {x: "A"}, {x: "B"}, {x: "A"}, {x: "D"}, {x: "C"}, {x: "C"}
rare x
```

```tql
{x: "D", count: 1}
{x: "C", count: 2}
{x: "B", count: 2}
{x: "A", count: 3}
```

### Show the five least common values for `id.orig_h`

```tql
rare id.orig_h
head 5
```

## See Also

* [`sort`](https://tenzir.com/docs/reference/operators/sort.md)
* [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md)
* [`top`](https://tenzir.com/docs/reference/operators/top.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
