---
title: "tdigest_cdf"
canonical: https://tenzir.com/docs/reference/functions/tdigest_cdf
source: https://tenzir.com/docs/reference/functions/tdigest_cdf.md
section: "Docs"
---

# tdigest_cdf

> Estimates a cumulative probability from a t-digest model.

Estimates a cumulative probability from a t-digest model.

```tql
tdigest_cdf(model:record, x:number) -> float
```

## Description

The `tdigest_cdf` function estimates an interpolated cumulative rank for `x`. Unlike an exact empirical [cumulative distribution function](https://en.wikipedia.org/wiki/Cumulative_distribution_function), it represents each centroid at its midpoint. It returns null for an empty model. A malformed model or a non-finite query value produces a warning and returns null.

### Definition

Let ordered centroids $(\mu_i,w_i)$ have total weight $W$, and let $S_i=\sum_{j<i}w_j$. Between adjacent means $\mu_i < x < \mu_{i+1}$, define

$$
t = \frac{x-\mu_i}{\mu_{i+1}-\mu_i}, \qquad \ell = \frac{\mathbf{1}[w_i=1]}{2}, \qquad r = \frac{\mathbf{1}[w_{i+1}=1]}{2}.
$$

The interpolated CDF is

$$
F(x) = \frac{S_i + w_i/2 + \ell + t\left((w_i+w_{i+1})/2-\ell-r\right)}{W}.
$$

The half-unit adjustments preserve singleton centroids as point masses. At one or more centroids with mean exactly $x$, the function returns the cumulative weight before them plus half their combined weight, divided by $W$. This is an interpolated rank, not the exact fraction of observations less than or equal to $x$. The tails interpolate between the exact `min` or `max` and the nearest centroid. Values below `min` return `0.0`; values above `max` return `1.0`.

## Examples

```tql
from {}
model = tdigest([1.0, 2.0, 3.0, 100.0])
select probability = tdigest_cdf(model, 3.0)
```

## See also

* [`tdigest`](https://tenzir.com/docs/reference/functions/tdigest.md)
* [`tdigest_quantile`](https://tenzir.com/docs/reference/functions/tdigest_quantile.md)
