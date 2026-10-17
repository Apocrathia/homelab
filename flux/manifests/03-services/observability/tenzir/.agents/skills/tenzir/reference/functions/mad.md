---
title: "mad"
canonical: https://tenzir.com/docs/reference/functions/mad
source: https://tenzir.com/docs/reference/functions/mad.md
section: "Docs"
---

# mad

> Computes the median absolute deviation of all grouped values.

Computes the median absolute deviation of all grouped values.

```tql
mad(xs:list) -> float|duration
```

## Description

The `mad` function returns the [median absolute deviation](https://en.wikipedia.org/wiki/Median_absolute_deviation) about the median of all numeric or duration values in `xs`: the median of `abs(x - median(xs))` over all values. The computation is exact.

Unlike the standard deviation, the MAD is robust to outliers, which makes it the dispersion statistic of choice for detecting regular patterns in noisy data: a single 10-minute gap in an otherwise steady 60-second beacon pushes the standard deviation past 180 seconds while the MAD stays put.

Duration input yields a duration result. Null values are ignored. If all values are null, `mad` returns null.

### `xs: list`

The values to evaluate.

## Examples

### Compute the median absolute deviation

```tql
from {x: 1}, {x: 2}, {x: 3}, {x: 4}, {x: 100}
summarize mad_value=mad(x)
```

```tql
{mad_value: 1.0}
```

The outlier `100` leaves the result untouched.

### Measure beacon interval jitter

A beacon checking in roughly every minute, give or take a few seconds:

```tql
from {
  times: [
    2024-01-01T00:00:00,
    2024-01-01T00:00:57,
    2024-01-01T00:01:57,
    2024-01-01T00:02:56,
  ],
}
select jitter = times.sort().deltas().mad()
```

```tql
{jitter: 1s}
```

## See Also

* [`deltas`](https://tenzir.com/docs/reference/functions/deltas.md)
* [`ewm_stddev`](https://tenzir.com/docs/reference/functions/ewm_stddev.md)
* [`ewma`](https://tenzir.com/docs/reference/functions/ewma.md)
* [`median`](https://tenzir.com/docs/reference/functions/median.md)
* [`skewness`](https://tenzir.com/docs/reference/functions/skewness.md)
* [`stddev`](https://tenzir.com/docs/reference/functions/stddev.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
