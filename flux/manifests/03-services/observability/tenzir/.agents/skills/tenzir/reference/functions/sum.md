---
title: "sum"
canonical: https://tenzir.com/docs/reference/functions/sum
source: https://tenzir.com/docs/reference/functions/sum.md
section: "Docs"
---

# sum

> Computes the sum of all values.

Computes the sum of all values.

```tql
sum(xs:list) -> int
```

## Description

The `sum` function computes the total of all number values.

### `xs: list`

The values to aggregate.

## Examples

### Compute a sum over a group of events

```tql
from {x: 1}, {x: 2}, {x: 3}
summarize n=sum(x)
```

```tql
{n: 6}
```

## See Also

* [`collect`](https://tenzir.com/docs/reference/functions/collect.md)
* [`max`](https://tenzir.com/docs/reference/functions/max.md)
* [`mean`](https://tenzir.com/docs/reference/functions/mean.md)
* [`min`](https://tenzir.com/docs/reference/functions/min.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
* [Plot data with charts](../../tutorials/plot-data-with-charts.md)
* [Learn idiomatic TQL](../../tutorials/learn-idiomatic-tql.md)
