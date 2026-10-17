---
title: "model_distance"
canonical: https://tenzir.com/docs/reference/functions/model_distance
source: https://tenzir.com/docs/reference/functions/model_distance.md
section: "Docs"
---

# model_distance

> Computes a distance between compatible statistical models.

Computes a distance between compatible statistical models.

```tql
model_distance(p:record, q:record, method=string) -> float
```

## Description

The `model_distance` function compares two non-empty t-digest models. The `method` argument must be one of these constant strings:

* `"kolmogorov_smirnov"` computes the [Kolmogorov-Smirnov statistic](https://en.wikipedia.org/wiki/Kolmogorov%E2%80%93Smirnov_test): the maximum vertical separation between the approximate cumulative distribution functions. The result ranges from `0.0` to `1.0`.
* `"wasserstein"` approximates the one-dimensional [Wasserstein distance](https://en.wikipedia.org/wiki/Wasserstein_metric). The result uses the same units as the modeled numeric values.

### Definition

Let $F$ and $G$ be the piecewise-linear CDFs reconstructed from the two t-digests. For Kolmogorov-Smirnov distance, the function computes

$$
D_{KS} = \sup_x |F(x)-G(x)|.
$$

The implementation evaluates both CDFs at the union of their exact extrema and centroid means, plus the adjacent representable floating-point values on both sides of every breakpoint. These are all points where the maximum can occur in the reconstructed CDFs.

For one-dimensional Wasserstein distance, it computes

$$
W_1 = \int_{-\infty}^{\infty} |F(x)-G(x)|\,dx.
$$

Between consecutive breakpoints, $F-G$ is linear. The implementation integrates the absolute value of that line exactly, splitting implicitly where it crosses zero.

The models may use different compression values. An empty model returns null. Malformed models and unsupported model families produce a warning and return null.

## Examples

```tql
from {}
baseline = tdigest([10.0, 20.0, 30.0])
current = tdigest([20.0, 30.0, 40.0])
select distance = model_distance(
  baseline, current, method="wasserstein")
```

## See also

* [`model_divergence`](https://tenzir.com/docs/reference/functions/model_divergence.md)
* [`tdigest`](https://tenzir.com/docs/reference/functions/tdigest.md)
* [`tdigest_cdf`](https://tenzir.com/docs/reference/functions/tdigest_cdf.md)
