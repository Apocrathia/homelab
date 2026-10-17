---
title: "autocorrelation"
canonical: https://tenzir.com/docs/reference/functions/autocorrelation
source: https://tenzir.com/docs/reference/functions/autocorrelation.md
section: "Docs"
---

# autocorrelation

> Computes normalized autocorrelation coefficients of a list.

Computes normalized autocorrelation coefficients of a list.

```tql
autocorrelation(xs:list, [max_lag=int]) -> list
```

## Description

The `autocorrelation` function measures how strongly a series correlates with a shifted copy of itself, following the standard notion of [autocorrelation](https://en.wikipedia.org/wiki/Autocorrelation) from signal processing and time series analysis. For a series $x_0, \dots, x_{n-1}$ with mean $\bar{x}$, it computes the mean-centered, [biased estimator](https://en.wikipedia.org/wiki/Autocorrelation#Estimation)

$$
r_k = \frac{\sum_{i=0}^{n-1-k} (x_i - \bar{x})(x_{i+k} - \bar{x})} {\sum_{i=0}^{n-1} \bigl(x_i - \bar{x}\bigr)^2}
$$

for lags $k$ from `0` through `max_lag` inclusive, so the result has `max_lag + 1` elements and the element at index $k$ is the coefficient for lag $k$. The coefficient at lag 0 is always $1$, and all coefficients lie in $[-1, 1]$. A peak at lag $k$ means the series repeats every $k$ samples.

The biased estimator deliberately damps coefficients at long lags, which makes the fundamental period stand out against its harmonics.

### `xs: list`

The list to analyze. Elements must be numeric or durations. Durations convert to their nanosecond count; because the coefficients are normalized, the result is unitless either way.

The function returns `null` and emits a warning when the list is constant, has a single element, or contains `null` elements. An empty list yields an empty result.

### `max_lag = int (optional)`

The largest lag to compute. Values larger than the list length are clamped to the list length minus one.

Defaults to half the list length, since coefficients beyond that point average too few terms to be meaningful.

## Examples

### Detect an alternating pattern

A series that flips sign every element correlates negatively at lag 1 and positively at lag 2:

```tql
from {xs: [1.0, -1.0, 1.0, -1.0, 1.0, -1.0, 1.0, -1.0]}
select ys = xs.autocorrelation(max_lag=2)
```

```tql
{ys: [1.0, -0.875, 0.75]}
```

## See Also

* [`periodogram`](https://tenzir.com/docs/reference/functions/periodogram.md)
* [`dominant_period`](https://tenzir.com/docs/reference/functions/dominant_period.md)
