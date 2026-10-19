---
title: "ewm_stddev"
canonical: https://tenzir.com/docs/reference/functions/ewm_stddev
source: https://tenzir.com/docs/reference/functions/ewm_stddev.md
section: "Docs"
---

# ewm_stddev

> Computes an exponentially weighted moving standard deviation over a list.

Computes an exponentially weighted moving standard deviation over a list.

```tql
ewm_stddev(xs:list, [alpha=number, span=number, com=number,
           halflife=number|duration, times=list, adjust=bool,
           bias=bool, ignore_nulls=bool]) -> list<double>
```

## Description

The `ewm_stddev` function returns the square root of [`ewm_variance`](https://tenzir.com/docs/reference/functions/ewm_variance.md) for every position in `xs`:

$$
s_t = \sqrt{f_t \cdot \frac{\sum_{i=0}^{t} w_i \, (x_i - y_t)^2} {\sum_{i=0}^{t} w_i}}
$$

where $y_t$ is the exponentially weighted mean, $w_i$ are the decaying weights of [`ewma`](https://tenzir.com/docs/reference/functions/ewma.md), and $f_t$ is the debiasing factor that `bias=true` disables. All options behave exactly as in [`ewm_variance`](https://tenzir.com/docs/reference/functions/ewm_variance.md), including the null handling: with the default `bias=false`, the first numeric element yields null, and with `bias=true` it yields `0.0`.

Together with [`ewma`](https://tenzir.com/docs/reference/functions/ewma.md), the function turns a smoothed series into a streaming baseline: the deviation of an observation from the exponentially weighted mean, divided by the exponentially weighted standard deviation, is a z-score with built-in recency. Note that mean and standard deviation are not robust statistics: a large anomaly inflates both and can mask subsequent anomalies. When outliers should not contaminate the baseline, prefer robust alternatives built from [`median`](https://tenzir.com/docs/reference/functions/median.md) and [`mad`](https://tenzir.com/docs/reference/functions/mad.md).

### `xs: list`

The numeric list to analyze.

### `alpha = number` (optional)

The smoothing factor in the range `(0, 1]`.

### `span = number` (optional)

The span, which must be at least `1`.

### `com = number` (optional)

The center of mass, which must be non-negative.

### `halflife = number|duration` (optional)

The period over which an observation’s weight decays by half. A duration half-life measures the gaps in `times` and requires the `times` option.

### `times = list` (optional)

A list of non-null, non-decreasing timestamps with the same length as `xs`. You can use `times` only with a duration `halflife` and `adjust=true`.

### `adjust = bool` (optional)

Controls how the function applies weights, as in [`ewma`](https://tenzir.com/docs/reference/functions/ewma.md). The default is `true`.

### `bias = bool` (optional)

Controls whether the function debiases the weighted variance before taking the square root. The default is `false`.

### `ignore_nulls = bool` (optional)

Controls whether null positions contribute decay, as in [`ewma`](https://tenzir.com/docs/reference/functions/ewma.md). The default is `false`.

## Examples

### Track the standard deviation of a list

```tql
from {xs: [1, 2, 3, 4]}
select result = xs.ewm_stddev(span=3)
```

```tql
{result: [null, 0.7071067811865476, 0.9636241116594314, 1.1771636613972951]}
```

### Score a new observation against a streaming baseline

```tql
from {xs: [10, 12, 11, 13, 12, 11]}
observed = 40
score = (observed - xs.ewma(span=5).last()) / xs.ewm_stddev(span=5).last()
select score
```

```tql
{score: 30.456250341231787}
```

## See Also

* [`ewm_variance`](https://tenzir.com/docs/reference/functions/ewm_variance.md)
* [`ewma`](https://tenzir.com/docs/reference/functions/ewma.md)
* [`mad`](https://tenzir.com/docs/reference/functions/mad.md)
* [`stddev`](https://tenzir.com/docs/reference/functions/stddev.md)
