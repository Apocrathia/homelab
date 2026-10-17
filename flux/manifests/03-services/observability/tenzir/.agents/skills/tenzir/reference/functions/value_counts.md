---
title: "value_counts"
canonical: https://tenzir.com/docs/reference/functions/value_counts
source: https://tenzir.com/docs/reference/functions/value_counts.md
section: "Docs"
---

# value_counts

> Returns a list of all grouped values alongside their frequency.

Returns a list of all grouped values alongside their frequency.

```tql
value_counts(xs:list) -> list
```

## Description

The `value_counts` function returns a list of all unique non-null values in `xs` alongside their occurrence count.

### `xs: list`

The values to evaluate.

## Examples

### Get value counts

```tql
from {x: 1}, {x: 2}, {x: 2}, {x: 3}
summarize counts=value_counts(x)
```

```tql
{counts: [{value: 1, count: 1}, {value: 2, count: 2}, {value: 3, count: 1}]}
```

## See Also

* [`mode`](https://tenzir.com/docs/reference/functions/mode.md)
* [`distinct`](https://tenzir.com/docs/reference/functions/distinct.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
