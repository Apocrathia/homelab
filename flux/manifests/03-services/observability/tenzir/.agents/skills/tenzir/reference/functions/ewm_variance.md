---
title: "ewm_variance"
canonical: https://tenzir.com/docs/reference/functions/ewm_variance
source: https://tenzir.com/docs/reference/functions/ewm_variance.md
section: "Docs"
---

# ewm_variance

> Computes an exponentially weighted moving variance over a list.

Computes an exponentially weighted moving variance over a list.

```tql
ewm_variance(xs:list, [alpha=number, span=number, com=number,
             halflife=number|duration, times=list, adjust=bool,
             bias=bool, ignore_nulls=bool]) -> list<double>
```

## Description

The `ewm_variance` function returns an exponentially weighted moving variance for every position in `xs`. It accepts lists of integers, unsigned integers, or doubles and always returns a list of doubles with the same length. It uses the same zero-based, pandas-convention weights as [`ewma`](https://tenzir.com/docs/reference/functions/ewma.md): with a decay parameter `alpha`, observation $x_i$ carries weight $w_i = (1 - \alpha)^{t-i}$ at position $t$. With a duration `halflife` $h$ and timestamps $\tau_i$ from `times`, it carries weight $w_i = 2^{-(\tau_t - \tau_i)/h}$. The variance at position $t$ is the weighted second moment around the exponentially weighted mean $y_t$:

$$
s_t^2 = f_t \cdot \frac{\sum_{i=0}^{t} w_i \, (x_i - y_t)^2} {\sum_{i=0}^{t} w_i}
$$

By default, the debiasing factor $f_t$ corrects for the effective sample size of the decaying weights, matching the `bias=False` behavior of pandas `ewm().var()`:

$$
f_t = \frac{\bigl(\sum_{i} w_i\bigr)^2} {\bigl(\sum_{i} w_i\bigr)^2 - \sum_{i} w_i^2}
$$

With `bias=true`, the factor is $f_t = 1$ and the function returns the plain weighted second moment.

Choose exactly one decay parameter among `alpha`, `span`, `com`, and `halflife`. The decay parameters, `times`, `adjust`, and `ignore_nulls` behave exactly as in [`ewma`](https://tenzir.com/docs/reference/functions/ewma.md).

A null list yields null. Empty lists remain empty. Leading null elements remain null. With the default `bias=false`, the first numeric element also yields null, because the debiasing factor is undefined for a single observation; with `bias=true` it yields `0.0`. After the first numeric element, a null element repeats the current variance so that the result keeps the input element positions. A NaN element counts as null.

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

Controls whether the function debiases the weighted variance. The default is `false`, which applies the debiasing factor $f_t$.

### `ignore_nulls = bool` (optional)

Controls whether null positions contribute decay, as in [`ewma`](https://tenzir.com/docs/reference/functions/ewma.md). The default is `false`.

## Examples

### Track the variance of a list

```tql
from {xs: [1, 2, 3, 4]}
select result = xs.ewm_variance(span=3)
```

```tql
{result: [null, 0.5, 0.9285714285714283, 1.385714285714286]}
```

### Compute the biased weighted moment

```tql
from {xs: [1, 2, 3, 4]}
select result = xs.ewm_variance(alpha=0.5, bias=true)
```

```tql
{result: [0.0, 0.2222222222222222, 0.530612244897959, 0.8622222222222223]}
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
select result = xs.ewm_variance(halflife=1d, times=times)
```

```tql
{result: [null, 0.5000000000000001, 0.7727272727272726]}
```

## See Also

* [`ewm_stddev`](https://tenzir.com/docs/reference/functions/ewm_stddev.md)
* [`ewma`](https://tenzir.com/docs/reference/functions/ewma.md)
* [`mad`](https://tenzir.com/docs/reference/functions/mad.md)
* [`variance`](https://tenzir.com/docs/reference/functions/variance.md)
