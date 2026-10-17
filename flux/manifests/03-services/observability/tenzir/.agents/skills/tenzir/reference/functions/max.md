---
title: "max"
canonical: https://tenzir.com/docs/reference/functions/max
source: https://tenzir.com/docs/reference/functions/max.md
section: "Docs"
---

# max

> Computes the maximum of all grouped values.

Computes the maximum of all grouped values.

```tql
max(xs:list) -> number
```

## Description

The `max` function returns the largest numeric value in `xs`.

### `xs: list`

The values to evaluate.

## Examples

### Find the maximum value

```tql
from {x: 1}, {x: 2}, {x: 3}
summarize max_value=max(x)
```

```tql
{max_value: 3}
```

## See Also

* [`min`](https://tenzir.com/docs/reference/functions/min.md)
* [`mean`](https://tenzir.com/docs/reference/functions/mean.md)
* [`sum`](https://tenzir.com/docs/reference/functions/sum.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
* [Plot data with charts](../../tutorials/plot-data-with-charts.md)
