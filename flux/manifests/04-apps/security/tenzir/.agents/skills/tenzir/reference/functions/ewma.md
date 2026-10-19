---
title: "ewma"
canonical: https://tenzir.com/docs/reference/functions/ewma
source: https://tenzir.com/docs/reference/functions/ewma.md
section: "Docs"
---

# ewma

> Computes an exponentially weighted moving average over a list.

Computes an exponentially weighted moving average over a list.

```tql
ewma(xs:list, [alpha=number, span=number, com=number,
     halflife=number|duration, times=list, adjust=bool,
     ignore_nulls=bool]) -> list<double>
```

## Description

The `ewma` function returns an exponentially weighted moving average for every position in `xs`. It accepts lists of integers, unsigned integers, or doubles and always returns a list of doubles with the same length. It follows the standard notion of an [exponentially weighted moving average](https://en.wikipedia.org/wiki/Exponential_smoothing) from time series analysis. With the default `adjust=true`, the result at position $t$ is the weighted mean

$$
y_t = \frac{\sum_{i=0}^{t} (1 - \alpha)^{t-i} \, x_i} {\sum_{i=0}^{t} (1 - \alpha)^{t-i}}
$$

where $t$ and $i$ are zero-based list positions, so the newest observation $x_t$ carries weight $1$ and older observations decay geometrically. These are the [pandas `ewm`](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.ewm.html) conventions; libraries that seed the average differently, such as R’s `TTR::EMA`, produce different leading values. With `adjust=false`, it is the recursive form

$$
y_0 = x_0, \qquad y_t = (1 - \alpha) \, y_{t-1} + \alpha \, x_t
$$

With a duration `halflife` $h$ and timestamps $\tau_0, \dots, \tau_t$ from `times`, each observation’s weight halves per elapsed half-life:

$$
y_t = \frac{\sum_{i=0}^{t} 2^{-(\tau_t - \tau_i)/h} \, x_i} {\sum_{i=0}^{t} 2^{-(\tau_t - \tau_i)/h}}
$$

Choose exactly one decay parameter:

* `alpha`: The smoothing factor
  $\alpha$
  directly, where
  $0 < \alpha \leq 1$
  .
* `span`: A span
  $s \geq 1$
  , converted to
  $\alpha = 2 / (s + 1)$
  .
* `com`: A non-negative center of mass
  $c$
  , converted to
  $\alpha = 1 / (1 + c)$
  .
* Numeric `halflife`: A positive number of list positions
  $h$
  , converted to
  $\alpha = 1 - e^{-\ln(2) / h}$
  .
* Duration `halflife`: A positive duration used with `times` for time-aware decay.

The companion functions [`ewm_variance`](https://tenzir.com/docs/reference/functions/ewm_variance.md) and [`ewm_stddev`](https://tenzir.com/docs/reference/functions/ewm_stddev.md) compute the matching second moments with the same options.

All numeric decay parameters must be finite. A null list yields null. Empty lists remain empty. Leading null elements remain null. After the first numeric element, a null element repeats the current average so that the result keeps the input element positions. A NaN element counts as null.

### `xs: list`

The numeric list to smooth.

### `alpha = number` (optional)

The smoothing factor in the range `(0, 1]`.

### `span = number` (optional)

The span, which must be at least `1`.

### `com = number` (optional)

The center of mass, which must be non-negative. A value of `0` gives `alpha = 1`, so each numeric result equals the current input value.

### `halflife = number|duration` (optional)

The period over which an observation’s weight decays by half.

A numeric half-life counts list positions. A duration half-life measures the gaps in `times` and requires the `times` option.

### `times = list` (optional)

A list of non-null, non-decreasing timestamps with the same length as `xs`. Repeated timestamps are valid and apply no decay between those positions.

You can use `times` only with a duration `halflife`. Time-aware decay currently requires `adjust=true`.

### `adjust = bool` (optional)

Controls how the function applies weights. The default is `true`.

With `adjust=true`, the function divides by the sum of the decaying weights. For example, the weights for the first three values are proportional to `(1 - alpha)^2`, `(1 - alpha)`, and `1`.

With `adjust=false`, the function uses the recursive form `y[0] = x[0]` and `y[t] = (1 - alpha) * y[t-1] + alpha * x[t]`. This form is unavailable with `times`.

### `ignore_nulls = bool` (optional)

Controls whether null positions contribute decay. The default is `false`.

With `ignore_nulls=false`, every list position after the first numeric element contributes decay. In time-aware mode, every elapsed interval after that point contributes decay. With `ignore_nulls=true`, null positions do not contribute decay. In time-aware mode, the interval ending at a null observation is skipped.

## Examples

### Smooth a list with a span

```tql
from {xs: [1, 2, 3, 4]}
select result = xs.ewma(span=3)
```

```tql
{result: [1.0, 1.6666666666666667, 2.4285714285714284, 3.2666666666666666]}
```

### Use the recursive form

```tql
from {xs: [1, 2, 3, 4]}
select result = ewma(xs, alpha=0.5, adjust=false)
```

```tql
{result: [1.0, 1.5, 2.25, 3.125]}
```

### Decay over irregular timestamps

```tql
from {
  xs: [1, 2, 3],
  times: [
    2024-01-01T00:00:00,
    2024-01-03T00:00:00,
    2024-01-04T00:00:00,
  ],
}
select result = xs.ewma(halflife=1d, times=times)
```

```tql
{result: [1.0, 1.8, 2.5384615384615383]}
```

## See Also

* [`deltas`](https://tenzir.com/docs/reference/functions/deltas.md)
* [`ewm_stddev`](https://tenzir.com/docs/reference/functions/ewm_stddev.md)
* [`ewm_variance`](https://tenzir.com/docs/reference/functions/ewm_variance.md)
* [`mad`](https://tenzir.com/docs/reference/functions/mad.md)
* [`mean`](https://tenzir.com/docs/reference/functions/mean.md)
* [`median`](https://tenzir.com/docs/reference/functions/median.md)
* [Shape lists](../../guides/shape/shape-lists.md)
