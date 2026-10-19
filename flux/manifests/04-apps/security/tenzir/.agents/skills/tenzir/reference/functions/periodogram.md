---
title: "periodogram"
canonical: https://tenzir.com/docs/reference/functions/periodogram
source: https://tenzir.com/docs/reference/functions/periodogram.md
section: "Docs"
---

# periodogram

> Computes the spectral power of a list per period.

Computes the spectral power of a list per period.

```tql
periodogram(xs:list) -> list
```

## Description

The `periodogram` function estimates how much of the signal’s variance sits at each frequency, computing the classical [periodogram](https://en.wikipedia.org/wiki/Periodogram) from spectral density estimation. It removes the mean from the series, zero-pads it to the next power of two $N$, applies a [fast Fourier transform](https://en.wikipedia.org/wiki/Fast_Fourier_transform), and returns one record `{period: float, power: float}` per frequency bin $k = 1, \dots, N/2$, in ascending frequency order. For the demeaned series $\tilde{x}_j = x_j - \bar{x}$ of original length $n$, the power of bin $k$ is

$$
P_k = \frac{1}{n} \left| \sum_{j=0}^{N-1} \tilde{x}_j \, e^{-2\pi i jk/N} \right|^2
$$

where samples beyond $n$ are zero from padding. The `period` of bin $k$ is $N / k$, expressed in samples: a bare list carries no time semantics, so a period of `4.0` means the signal repeats every four elements. To recover a wall-clock period from timestamps, use [`dominant_period`](https://tenzir.com/docs/reference/functions/dominant_period.md) instead.

### `xs: list`

The list to analyze. Elements must be numeric or durations. The function returns `null` and emits a warning when the list contains `null` elements. Lists with fewer than two elements yield an empty result. A constant list yields zero power everywhere.

## Examples

### Find the period of an oscillating series

A signal that repeats every four samples puts all its power into the bin with period `4.0`:

```tql
from {xs: [1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0]}
select ys = xs.periodogram().where(r => r.power > 0)
```

```tql
{ys: [{period: 4.0, power: 4.0}]}
```

## See Also

* [`autocorrelation`](https://tenzir.com/docs/reference/functions/autocorrelation.md)
* [`dominant_period`](https://tenzir.com/docs/reference/functions/dominant_period.md)
