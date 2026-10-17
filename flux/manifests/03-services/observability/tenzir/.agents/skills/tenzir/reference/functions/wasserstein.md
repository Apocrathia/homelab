---
title: "wasserstein"
canonical: https://tenzir.com/docs/reference/functions/wasserstein
source: https://tenzir.com/docs/reference/functions/wasserstein.md
section: "Docs"
---

# wasserstein

> Computes the first Wasserstein distance between empirical distributions.

Computes the first Wasserstein distance between empirical distributions.

```tql
wasserstein(x:list, y:list) -> float|duration
```

## Description

The `wasserstein` function measures how far one empirical distribution must move along one dimension to match another. Numeric samples produce a `float` in the same unit as their values. Duration or timestamp samples produce a duration.

### Definition

For empirical CDFs $F_n$ and $G_m$, the function computes

$$
W_1 = \int_{-\infty}^{\infty}|F_n(x)-G_m(x)|\,dx.
$$

The two samples may have different lengths. They must both be non-empty and must both contain numbers, durations, or timestamps. Temporal samples must have the same type. Null elements, non-finite numbers, and numeric integers outside the exactly representable range from $-2^{53}$ through $2^{53}$ produce a warning and return null. A temporal result outside the supported duration range also produces a warning and returns null.

## Examples

The following samples represent baseline and current OCSF `trace.span.duration` values from coding-agent activity:

```tql
from {}
select span_shift_ms=wasserstein(
         [17, 100, 373, 1000, 1000],
         [1000, 1000, 2000, 2997, 2997],
       ),
       duration_shift=wasserstein(
         [17ms, 100ms, 373ms, 1s, 1s],
         [1s, 1s, 2s, 2997ms, 2997ms],
       )
```

```tql
{span_shift_ms: 1500.8, duration_shift: 1.5008s}
```

## See also

* [`model_distance`](https://tenzir.com/docs/reference/functions/model_distance.md)
* [`ecdf`](https://tenzir.com/docs/reference/functions/ecdf.md)
* [`kolmogorov_smirnov`](https://tenzir.com/docs/reference/functions/kolmogorov_smirnov.md)
