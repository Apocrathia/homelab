---
title: "mean"
canonical: https://tenzir.com/docs/reference/functions/mean
source: https://tenzir.com/docs/reference/functions/mean.md
section: "Docs"
---

# mean

> Computes the mean of all grouped values.

Computes the mean of all grouped values.

```tql
mean(xs:list) -> float
```

## Description

The `mean` function returns the average of all numeric values in `xs`.

### `xs: list`

The values to average.

## Examples

### Compute the mean value

```tql
from {x: 1}, {x: 2}, {x: 3}
summarize avg=mean(x)
```

```tql
{avg: 2.0}
```

## See Also

* [`max`](https://tenzir.com/docs/reference/functions/max.md)
* [`median`](https://tenzir.com/docs/reference/functions/median.md)
* [`min`](https://tenzir.com/docs/reference/functions/min.md)
* [`quantile`](https://tenzir.com/docs/reference/functions/quantile.md)
* [`stddev`](https://tenzir.com/docs/reference/functions/stddev.md)
* [`sum`](https://tenzir.com/docs/reference/functions/sum.md)
* [`variance`](https://tenzir.com/docs/reference/functions/variance.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
* [Plot data with charts](../../tutorials/plot-data-with-charts.md)
* [Learn idiomatic TQL](../../tutorials/learn-idiomatic-tql.md)
