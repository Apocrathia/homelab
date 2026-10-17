---
title: "count_distinct"
canonical: https://tenzir.com/docs/reference/functions/count_distinct
source: https://tenzir.com/docs/reference/functions/count_distinct.md
section: "Docs"
---

# count_distinct

> Counts all distinct non-null grouped values.

Counts all distinct non-null grouped values.

```tql
count_distinct(xs:list) -> int
```

## Description

The `count_distinct` function returns the number of unique, non-null values in `xs`.

### `xs: list`

The values to count.

## Examples

### Count distinct values

```tql
from {x: 1}, {x: 2}, {x: 2}, {x: 3}
summarize unique=count_distinct(x)
```

```tql
{unique: 3}
```

## See Also

* [`count`](https://tenzir.com/docs/reference/functions/count.md)
* [`distinct`](https://tenzir.com/docs/reference/functions/distinct.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
