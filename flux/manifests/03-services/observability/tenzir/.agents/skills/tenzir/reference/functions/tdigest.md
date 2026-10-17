---
title: "tdigest"
canonical: https://tenzir.com/docs/reference/functions/tdigest
source: https://tenzir.com/docs/reference/functions/tdigest.md
section: "Docs"
---

# tdigest

> Builds a mergeable t-digest model of a numeric distribution.

Builds a mergeable t-digest model of a numeric distribution.

```tql
tdigest(xs:list, [compression=uint]) -> record
```

## Description

The `tdigest` function approximates a numeric distribution with a [t-digest](https://arxiv.org/abs/1902.04023) and bounded state. Use [`tdigest_quantile`](https://tenzir.com/docs/reference/functions/tdigest_quantile.md) and [`tdigest_cdf`](https://tenzir.com/docs/reference/functions/tdigest_cdf.md) for point queries. Use [`model_distance`](https://tenzir.com/docs/reference/functions/model_distance.md) to compare two models.

### Definition

The model stores at most $\delta =$ `compression` ordered centroids $(\mu_i, w_i)`, where$\mu\_i$is a weighted mean and$w\_i$ is the number of represented observations. Their total weight is

$$
W = \sum_i w_i = \text{count}.
$$

Inputs and existing centroids enter one stream ordered by mean. Adjacent items merge by the weighted-mean update

$$
\mu \leftarrow \mu + (\mu' - \mu)\frac{w'}{w+w'}, \qquad w \leftarrow w+w'.
$$

The implementation uses the arcsine scale

$$
k(q) = \frac{\delta}{2\pi}\arcsin(2q-1).
$$

For a non-singleton centroid spanning cumulative quantiles $q_0$ through $q_1$, the model enforces $k(q_1)-k(q_0) \le 1.001$. This keeps centroids smaller near the distribution tails. The exact `min` and `max` remain separate from the centroids.

### `xs: list`

The `int`, `uint`, or `float` values to add. The function counts null and non-finite values but excludes them from the digest.

### `compression = uint (optional)`

Controls the maximum centroid count. Higher values retain more detail and use more memory. The value must be between 10 and 10,000 and defaults to `100`.

## Result

```tql
{
  model: "tdigest",
  version: 1,
  input_count: uint,
  count: uint,
  null_count: uint,
  compression: uint,
  non_finite_count: uint,
  min: float,
  max: float,
  centroids: [{mean: float, weight: float}, ...],
}
```

The `min` and `max` fields are null when `count` is zero.

## Examples

### Estimate a percentile

```tql
from {latency: 10.0}, {latency: 20.0}, {latency: 80.0}
summarize latency_model = tdigest(latency)
select p95 = tdigest_quantile(latency_model, 0.95)
```

## See also

* [`tdigest_quantile`](https://tenzir.com/docs/reference/functions/tdigest_quantile.md)
* [`tdigest_cdf`](https://tenzir.com/docs/reference/functions/tdigest_cdf.md)
* [`model_distance`](https://tenzir.com/docs/reference/functions/model_distance.md)
* [`model_merge`](https://tenzir.com/docs/reference/functions/model_merge.md)
