---
title: "quantile"
canonical: https://tenzir.com/docs/reference/functions/quantile
source: https://tenzir.com/docs/reference/functions/quantile.md
section: "Docs"
---

# quantile

> Computes the specified quantile of all grouped values.

Computes the specified quantile of all grouped values.

```tql
quantile(xs:list, q=float) -> float
```

## Description

The `quantile` function returns the quantile of all numeric values in `xs`, specified by the argument `q`, which should be a value between 0 and 1.

### `xs: list`

The values to evaluate.

### `q: float`

The quantile to compute, where `q=0.5` represents the median.

## Examples

### Compute the 0.5 quantile (median) of values

```tql
from {x: 1}, {x: 2}, {x: 3}, {x: 4}
summarize median_value=quantile(x, q=0.5)
```

```tql
{median_value: 2.5}
```

## See Also

* [`median`](https://tenzir.com/docs/reference/functions/median.md)
* [`mean`](https://tenzir.com/docs/reference/functions/mean.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
