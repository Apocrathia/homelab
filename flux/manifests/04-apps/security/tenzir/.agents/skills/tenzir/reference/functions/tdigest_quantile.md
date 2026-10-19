---
title: "tdigest_quantile"
canonical: https://tenzir.com/docs/reference/functions/tdigest_quantile
source: https://tenzir.com/docs/reference/functions/tdigest_quantile.md
section: "Docs"
---

# tdigest_quantile

> Estimates a quantile from a t-digest model.

Estimates a quantile from a t-digest model.

```tql
tdigest_quantile(model:record, q:number) -> float
```

## Description

The `tdigest_quantile` function estimates the value at [quantile](https://en.wikipedia.org/wiki/Quantile) `q`, where `q` must be finite and between `0.0` and `1.0`. It returns null for an empty model. Malformed models and invalid quantiles produce a warning and return null.

### Definition

For ordered centroids $(\mu_i,w_i)$ with total weight $W$, define each centroid center rank as

$$
r_i = \sum_{j<i} w_j + \frac{w_i}{2}.
$$

The query rank is $r=qW$. The function first returns the exact model minimum when $r \le 1$. Otherwise, it returns the exact model maximum when $r \ge W-1$. This order matters when both conditions hold, such as for a model with total weight 2. Inside the distribution it locates the centroid containing $r$ and linearly interpolates between adjacent centroid means according to their half-weights. A unit-weight centroid returns its mean exactly when $r$ falls on that observation. Interpolation between an extreme centroid and the exact `min` or `max` uses the same half-weight convention.

## Examples

```tql
from {}
model = tdigest([1.0, 2.0, 3.0, 100.0])
select median = tdigest_quantile(model, 0.5),
  p99 = tdigest_quantile(model, 0.99)
```

## See also

* [`tdigest`](https://tenzir.com/docs/reference/functions/tdigest.md)
* [`tdigest_cdf`](https://tenzir.com/docs/reference/functions/tdigest_cdf.md)
