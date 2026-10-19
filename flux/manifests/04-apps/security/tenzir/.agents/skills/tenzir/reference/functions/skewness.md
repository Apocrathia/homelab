---
title: "skewness"
canonical: https://tenzir.com/docs/reference/functions/skewness
source: https://tenzir.com/docs/reference/functions/skewness.md
section: "Docs"
---

# skewness

> Computes the skewness of all grouped values.

Computes the skewness of all grouped values.

```tql
skewness(xs:list, [method=string]) -> float
```

## Description

The `skewness` function measures the [skewness](https://en.wikipedia.org/wiki/Skewness), or asymmetry, of the distribution of all numeric or duration values in `xs`. Symmetric distributions have zero skewness; a positive value indicates a longer right tail.

Skewness is dimensionless, so duration input yields a plain float. Null values are ignored. If all values are null, `skewness` returns null.

Input with zero dispersion, where all values are equal, returns `0.0` for both methods rather than the 0/0 that a hand-rolled computation hits. This matters for cadence analysis: a perfectly regular beacon has zero-dispersion intervals, and a predicate like `abs(skew) <= 0.3` must keep it.

### `xs: list`

The values to evaluate.

### `method = string (optional)`

The skewness estimator to use:

* `"moment"` (default): population moment skewness, the third [standardized central moment](https://en.wikipedia.org/wiki/Standardized_moment) `m3 / m2^1.5`.
* `"bowley"`: [quantile-based Bowley skewness](https://en.wikipedia.org/wiki/Skewness#Quantile-based_measures) `(q3 + q1 - 2*q2) / (q3 - q1)`, with quartiles computed by [linear interpolation](https://en.wikipedia.org/wiki/Quantile#Estimating_quantiles_from_a_sample). Bounded to `[-1, 1]` and robust to outliers.

## Examples

### Compute moment skewness

```tql
from {x: 1}, {x: 1}, {x: 1}, {x: 10}
summarize skew=skewness(x)
```

```tql
{skew: 1.1547005383792515}
```

### Score beacon interval regularity with Bowley skewness

A beacon checking in roughly every minute misses one check-in, but the quartile-based skewness stays small and bounded. The cadence remains regular except for one outlier:

```tql
from {
  times: [
    2024-01-01T00:00:00,
    2024-01-01T00:00:57,
    2024-01-01T00:01:57,
    2024-01-01T00:02:56,
    2024-01-01T00:03:59,
    2024-01-01T00:05:59,
  ],
}
interval_skew = times.sort().deltas().skewness(method="bowley")
select interval_skew = round(interval_skew * 10000) / 10000
```

```tql
{interval_skew: 0.5}
```

A perfectly regular beacon has zero-dispersion intervals and yields exactly `0.0`.

## See Also

* [`deltas`](https://tenzir.com/docs/reference/functions/deltas.md)
* [`mad`](https://tenzir.com/docs/reference/functions/mad.md)
* [`median`](https://tenzir.com/docs/reference/functions/median.md)
* [`quantile`](https://tenzir.com/docs/reference/functions/quantile.md)
* [`stddev`](https://tenzir.com/docs/reference/functions/stddev.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
