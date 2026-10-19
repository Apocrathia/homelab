---
title: "kolmogorov_smirnov"
canonical: https://tenzir.com/docs/reference/functions/kolmogorov_smirnov
source: https://tenzir.com/docs/reference/functions/kolmogorov_smirnov.md
section: "Docs"
---

# kolmogorov_smirnov

> Computes the two-sample Kolmogorov-Smirnov distance.

Computes the two-sample Kolmogorov-Smirnov distance.

```tql
kolmogorov_smirnov(x:list, y:list) -> float
```

## Description

The `kolmogorov_smirnov` function compares two empirical numeric, duration, or timestamp distributions. It returns the largest absolute difference between their cumulative distribution functions.

### Definition

For empirical CDFs $F_n$ and $G_m$, the function computes

$$
D_{n,m} = \sup_x |F_n(x)-G_m(x)|.
$$

The result ranges from `0.0` to `1.0`. A larger value means that the greatest separation between the distributions is larger. This function returns the distance, not a hypothesis-test p-value.

The two samples may have different lengths. They must both be non-empty and must both contain numbers, durations, or timestamps. Temporal samples must have the same type. Null elements, non-finite numbers, and numeric integers outside the exactly representable range from $-2^{53}$ through $2^{53}$ produce a warning and return null.

## Examples

The following samples represent baseline and current OCSF `trace.span.duration` values from coding-agent activity:

```tql
from {}
select span_distance=kolmogorov_smirnov(
         [17, 100, 373, 1000, 1000],
         [1000, 1000, 2000, 2997, 2997],
       ),
       duration_distance=kolmogorov_smirnov(
         [17ms, 100ms, 373ms, 1s, 1s],
         [1s, 1s, 2s, 2997ms, 2997ms],
       )
```

```tql
{span_distance: 0.6, duration_distance: 0.6}
```

## See also

* [`model_distance`](https://tenzir.com/docs/reference/functions/model_distance.md)
* [`ecdf`](https://tenzir.com/docs/reference/functions/ecdf.md)
* [`wasserstein`](https://tenzir.com/docs/reference/functions/wasserstein.md)
