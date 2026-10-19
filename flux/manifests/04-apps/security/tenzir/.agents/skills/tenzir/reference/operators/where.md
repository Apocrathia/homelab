---
title: "where"
canonical: https://tenzir.com/docs/reference/operators/where
source: https://tenzir.com/docs/reference/operators/where.md
section: "Docs"
---

# where

> Keeps only events for which the given predicate is true.

Keeps only events for which the given predicate is true.

```tql
where predicate:bool
```

## Description

The `where` operator only keeps events that match the provided predicate and discards all other events. Only events for which it evaluates to `true` pass. If the predicate evaluates to `null`, it is falsy, so `where` discards the event. See [Null is falsy in predicates](../expressions.md#null).

## Examples

### Keep only events where `src_ip` is `1.2.3.4`

```tql
where src_ip == 1.2.3.4
```

### Use a nested field name and a temporal constraint on the `ts` field

```tql
where id.orig_h == 1.2.3.4 and ts > now() - 1h
```

### Combine subnet, size and duration constraints

```tql
where src_ip in 10.10.5.0/25 and (orig_bytes > 1Mi or duration > 30min)
```

## See Also

* [`assert`](https://tenzir.com/docs/reference/operators/assert.md)
* [`drop`](https://tenzir.com/docs/reference/operators/drop.md)
* [`select`](https://tenzir.com/docs/reference/operators/select.md)
* [Filter and select data](../../guides/optimize/filter-and-select-data.md)
* [Learn idiomatic TQL](../../tutorials/learn-idiomatic-tql.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
