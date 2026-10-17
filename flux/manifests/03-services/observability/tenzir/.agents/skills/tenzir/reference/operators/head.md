---
title: "head"
canonical: https://tenzir.com/docs/reference/operators/head
source: https://tenzir.com/docs/reference/operators/head.md
section: "Docs"
---

# head

> Limits the input to the first n events.

Limits the input to the first `n` events.

```tql
head [n:int]
```

## Description

Forwards the first `n` events and discards the rest.

`head n` is a shorthand notation for [`slice end=n`](https://tenzir.com/docs/reference/operators/slice.md).

### `n: int (optional)`

The number of events to keep.

Defaults to `10`.

## Examples

### Get the first 10 events

```tql
head
```

### Get the first 5 events

```tql
head 5
```

## See Also

* [`slice`](https://tenzir.com/docs/reference/operators/slice.md)
* [`tail`](https://tenzir.com/docs/reference/operators/tail.md)
* [Slice and sample data](../../guides/optimize/slice-and-sample-data.md)
* [Plot data with charts](../../tutorials/plot-data-with-charts.md)
