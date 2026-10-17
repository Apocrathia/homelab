---
title: "ecdf"
canonical: https://tenzir.com/docs/reference/functions/ecdf
source: https://tenzir.com/docs/reference/functions/ecdf.md
section: "Docs"
---

# ecdf

> Evaluates an empirical cumulative distribution function at a value.

Evaluates an empirical cumulative distribution function at a value.

```tql
ecdf(samples:list, x:number|duration|time) -> float
```

## Description

The `ecdf` function returns the exact fraction of sample values less than or equal to `x`. It accepts numeric, duration, or timestamp samples. Temporal query values must match the sample type.

### Definition

For a non-empty sample $x_1, \dots, x_n$, the empirical cumulative distribution function at $x$ is

$$
F_n(x) = \frac{1}{n}\sum_{i=1}^{n}\mathbf{1}[x_i \le x].
$$

The result ranges from `0.0` to `1.0`. The function returns null for a null or empty sample. A sample containing nulls, non-finite numbers, or numeric integers outside the exactly representable range from $-2^{53}$ through $2^{53}$ produces a warning and returns null.

## Examples

The following samples represent OCSF `trace.span.duration` values from coding-agent activity:

```tql
from {}
select span_rank=ecdf([17, 100, 373, 1000], 373),
       duration_rank=ecdf([17ms, 100ms, 373ms, 1s], 373ms)
```

```tql
{span_rank: 0.75, duration_rank: 0.75}
```

## See also

* [`tdigest_cdf`](https://tenzir.com/docs/reference/functions/tdigest_cdf.md)
* [`kolmogorov_smirnov`](https://tenzir.com/docs/reference/functions/kolmogorov_smirnov.md)
* [`wasserstein`](https://tenzir.com/docs/reference/functions/wasserstein.md)
