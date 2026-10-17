---
title: "median"
canonical: https://tenzir.com/docs/reference/functions/median
source: https://tenzir.com/docs/reference/functions/median.md
section: "Docs"
---

# median

> Computes the approximate median of all grouped values using a t-digest algorithm.

Computes the approximate median of all grouped values using a t-digest algorithm.

```tql
median(xs:list) -> float
```

## Description

The `median` function returns an approximate median of all numeric values in `xs`, computed with a t-digest algorithm.

### `xs: list`

The values to evaluate.

## Examples

### Compute the median value

```tql
from {x: 1}, {x: 2}, {x: 3}, {x: 4}
summarize median_value=median(x)
```

```tql
{median_value: 2.5}
```

## See Also

* [`ewma`](https://tenzir.com/docs/reference/functions/ewma.md)
* [`mean`](https://tenzir.com/docs/reference/functions/mean.md)
* [`mode`](https://tenzir.com/docs/reference/functions/mode.md)
* [`quantile`](https://tenzir.com/docs/reference/functions/quantile.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
