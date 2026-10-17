---
title: "count"
canonical: https://tenzir.com/docs/reference/functions/count
source: https://tenzir.com/docs/reference/functions/count.md
section: "Docs"
---

# count

> Counts the events or non-null grouped values.

Counts the events or non-null grouped values.

```tql
count(xs:list) -> int
```

## Description

The `count` function returns the number of non-null values in `xs`. When used without arguments, it counts the total number of events.

### `xs: list`

The values to count.

## Examples

### Count the number of non-null values

```tql
from {x: 1}, {x: null}, {x: 2}
summarize total=count(x)
```

```tql
{total: 2}
```

## See Also

* [`count_distinct`](https://tenzir.com/docs/reference/functions/count_distinct.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
* [Plot data with charts](../../tutorials/plot-data-with-charts.md)
* [Learn idiomatic TQL](../../tutorials/learn-idiomatic-tql.md)
