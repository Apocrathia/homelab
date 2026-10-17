---
title: "top"
canonical: https://tenzir.com/docs/reference/operators/top
source: https://tenzir.com/docs/reference/operators/top.md
section: "Docs"
---

# top

> Shows the most common values.

Shows the most common values.

```tql
top x:field
```

## Description

Shows the most common values for a given field. For each value, a new event containing its count will be produced. In general, `top x` is equivalent to:

```tql
summarize x, count=count()
sort -count
```

This operator is the dual to [`rare`](https://tenzir.com/docs/reference/operators/rare.md).

Potentially High Memory Usage

Use caution when applying this operator to large inputs. It currently buffers aggregation state in memory. A downstream [`head`](https://tenzir.com/docs/reference/operators/head.md) bounds the final sort’s retained candidates, but does not reduce the number of aggregation groups. Out-of-core processing is on our roadmap.

### `x: field`

The field to find the most common values for.

## Examples

### Find the most common values

```tql
from {x: "B"}, {x: "A"}, {x: "A"}, {x: "B"}, {x: "A"}, {x: "D"}, {x: "C"}, {x: "C"}
top x
```

```tql
{x: "A", count: 3}
{x: "B", count: 2}
{x: "C", count: 2}
{x: "D", count: 1}
```

### Show the 5 top-most values

```tql
top id.orig_h
head 5
```

## See Also

* [`rare`](https://tenzir.com/docs/reference/operators/rare.md)
* [`sort`](https://tenzir.com/docs/reference/operators/sort.md)
* [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
* [Plot data with charts](../../tutorials/plot-data-with-charts.md)
