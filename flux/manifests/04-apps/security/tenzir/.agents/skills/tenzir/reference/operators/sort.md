---
title: "sort"
canonical: https://tenzir.com/docs/reference/operators/sort
source: https://tenzir.com/docs/reference/operators/sort.md
section: "Docs"
---

# sort

> Sorts events by the given expressions.

Sorts events by the given expressions.

```tql
sort [-]expr...
```

## Description

Sorts events by the given expressions, putting all `null` values at the end.

If multiple expressions are specified, the sorting happens lexicographically, that is: Later expressions are only considered if all previous expressions evaluate to equal values.

This operator performs a stable sort (preserves relative ordering when all expressions evaluate to the same value).

Potentially High Memory Usage

Without a downstream limit, this operator buffers all data in memory. An eligible downstream [`head`](https://tenzir.com/docs/reference/operators/head.md) bounds the retained events and sort keys. Sorting still reads the complete input before producing output. Out-of-core processing is on our roadmap.

### `[-]expr`

An expression that is evaluated for each event. Normally, events are sorted in ascending order. If the expression starts with `-`, descending order is used instead. In both cases, `null` is put last.

## Optimizations

A downstream `head N` lets `sort` retain only a bounded set of candidates for the first `N` results. Filters that move before `sort` run before candidate selection, so the bound counts matching events. A filter that must stay after a downstream `head` does not change that head’s bound.

```tql
sort -timestamp
where severity == "high"
head 10
```

Sorting still inspects every input event. It never pushes the limit upstream as a prefix limit. A downstream [`select`](https://tenzir.com/docs/reference/operators/select.md) can reduce upstream fields, while preserving dependencies of sort expressions and filters. Sorting by the whole event retains all fields.

The sort stages of [`top`](https://tenzir.com/docs/reference/operators/top.md) and [`rare`](https://tenzir.com/docs/reference/operators/rare.md) use the same optimization. Their aggregation still processes the full input and retains all groups.

Use `--dump-opt-ir` to inspect the retained sort bound and upstream projection.

## Examples

### Sort by a field in ascending order

```tql
sort timestamp
```

### Sort by a field in descending order

```tql
sort -timestamp
```

### Sort by multiple fields

Sort by a field `src_ip` and, in case of matching values, sort by `dest_ip`:

```tql
sort src_ip, dest_ip
```

Sort by the field `src_ip` in ascending order and by the field `dest_ip` in descending order.

```tql
sort src_ip, -dest_ip
```

## See Also

* [Repair out-of-order events](../../guides/shape/repair-out-of-order-events.md)
* [Replay historical events](../../guides/replay/replay-historical-events.md)
* [`rare`](https://tenzir.com/docs/reference/operators/rare.md)
* [`reverse`](https://tenzir.com/docs/reference/operators/reverse.md)
* [`top`](https://tenzir.com/docs/reference/operators/top.md)
* [Plot data with charts](../../tutorials/plot-data-with-charts.md)
