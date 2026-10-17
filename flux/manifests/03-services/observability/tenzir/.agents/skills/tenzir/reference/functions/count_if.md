---
title: "count_if"
canonical: https://tenzir.com/docs/reference/functions/count_if
source: https://tenzir.com/docs/reference/functions/count_if.md
section: "Docs"
---

# count_if

> Counts the events or non-null grouped values matching a given predicate.

Counts the events or non-null grouped values matching a given predicate.

```tql
count_if(xs:list, predicate:any -> bool) -> int
```

## Description

The `count_if` function returns the number of non-null values in `xs` that satisfy the given `predicate`. A `null` result is falsy and does not increase the count. See [Null is falsy in predicates](../expressions.md#null).

### `xs: list`

The values to count.

### `predicate: any -> bool`

The predicate to apply to each value to check whether it should be counted.

## Examples

### Count the number of values greater than 1

```tql
from {x: 1}, {x: null}, {x: 2}
summarize total=x.count_if(x => x > 1)
```

```tql
{total: 1}
```

## See Also

* [`count`](https://tenzir.com/docs/reference/functions/count.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
