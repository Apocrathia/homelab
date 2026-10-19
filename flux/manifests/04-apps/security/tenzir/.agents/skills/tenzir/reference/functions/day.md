---
title: "day"
canonical: https://tenzir.com/docs/reference/functions/day
source: https://tenzir.com/docs/reference/functions/day.md
section: "Docs"
---

# day

> Extracts the day component from a timestamp.

Extracts the day component from a timestamp.

```tql
day(x: time) -> int
```

## Description

The `day` function extracts the day component from a timestamp as an integer (1-31).

### `x: time`

The timestamp from which to extract the day.

## Examples

### Extract the day from a timestamp

```tql
from {
  ts: 2024-06-15T14:30:45.123456,
}
day = ts.day()
```

```tql
{
  ts: 2024-06-15T14:30:45.123456,
  day: 15,
}
```

## See Also

* [`year`](https://tenzir.com/docs/reference/functions/year.md)
* [`month`](https://tenzir.com/docs/reference/functions/month.md)
* [`hour`](https://tenzir.com/docs/reference/functions/hour.md)
* [`minute`](https://tenzir.com/docs/reference/functions/minute.md)
* [`second`](https://tenzir.com/docs/reference/functions/second.md)
* [Calculate with time](../../guides/shape/calculate-with-time.md)
