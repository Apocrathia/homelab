---
title: "stddev"
canonical: https://tenzir.com/docs/reference/functions/stddev
source: https://tenzir.com/docs/reference/functions/stddev.md
section: "Docs"
---

# stddev

> Computes the standard deviation of all grouped values.

Computes the standard deviation of all grouped values.

```tql
stddev(xs:list) -> float
```

## Description

The `stddev` function returns the standard deviation of all numeric values in `xs`.

### `xs: list`

The values to evaluate.

## Examples

### Compute the standard deviation of values

```tql
from {x: 1}, {x: 2}, {x: 3}
summarize stddev_value=stddev(x)
```

```tql
{stddev_value: 0.816}
```

## See Also

* [`variance`](https://tenzir.com/docs/reference/functions/variance.md)
* [`mean`](https://tenzir.com/docs/reference/functions/mean.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
