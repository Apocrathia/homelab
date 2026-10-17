---
title: "tail"
canonical: https://tenzir.com/docs/reference/operators/tail
source: https://tenzir.com/docs/reference/operators/tail.md
section: "Docs"
---

# tail

> Limits the input to the last n events.

Limits the input to the last `n` events.

```tql
tail [n:int]
```

## Description

Forwards the last `n` events and discards the rest.

`tail n` is a shorthand notation for [`slice begin=-n`](https://tenzir.com/docs/reference/operators/slice.md).

### `n: int (optional)`

The number of events to keep.

Defaults to `10`.

## Examples

### Get the last 10 results

```tql
export
tail
```

### Get the last 5 results

```tql
export
tail 5
```

## See Also

* [`head`](https://tenzir.com/docs/reference/operators/head.md)
* [`slice`](https://tenzir.com/docs/reference/operators/slice.md)
* [Slice and sample data](../../guides/optimize/slice-and-sample-data.md)
