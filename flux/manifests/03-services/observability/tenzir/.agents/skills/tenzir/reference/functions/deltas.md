---
title: "deltas"
canonical: https://tenzir.com/docs/reference/functions/deltas
source: https://tenzir.com/docs/reference/functions/deltas.md
section: "Docs"
---

# deltas

> Computes the successive differences between list elements.

Computes the successive differences between list elements.

```tql
deltas(xs:list) -> list
```

## Description

The `deltas` function returns a list of length `n - 1` where element `i` is `xs[i+1] - xs[i]`. These are the first-order [forward differences](https://en.wikipedia.org/wiki/Finite_difference) of the list. It accepts lists of numbers, durations, or timestamps. On timestamps, the differences are durations, which makes it a natural first step for cadence analysis: sorted event times become inter-arrival intervals in a single call.

Empty and single-element lists yield an empty list. A null list yields null. Pairs that involve a null element yield a null difference.

### `xs: list`

The list of numbers, durations, or timestamps to compute differences over.

## Examples

### Compute differences of numbers

```tql
from {xs: [1, 3, 6, 10]}
xs = xs.deltas()
```

```tql
{xs: [2, 3, 4]}
```

### Turn timestamps into inter-arrival intervals

```tql
from {
  times: [2024-01-01T00:00:00, 2024-01-01T00:01:00, 2024-01-01T00:02:30],
}
select intervals = times.sort().deltas()
```

```tql
{intervals: [1min, 1.5min]}
```

## See Also

* [`mad`](https://tenzir.com/docs/reference/functions/mad.md)
* [`skewness`](https://tenzir.com/docs/reference/functions/skewness.md)
* [`sort`](https://tenzir.com/docs/reference/functions/sort.md)
* [`zip`](https://tenzir.com/docs/reference/functions/zip.md)
* [Shape lists](../../guides/shape/shape-lists.md)
