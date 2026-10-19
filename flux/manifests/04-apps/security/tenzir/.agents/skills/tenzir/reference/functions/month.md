---
title: "month"
canonical: https://tenzir.com/docs/reference/functions/month
source: https://tenzir.com/docs/reference/functions/month.md
section: "Docs"
---

# month

> Extracts the month component from a timestamp.

Extracts the month component from a timestamp.

```tql
month(x: time) -> int
```

## Description

The `month` function extracts the month component from a timestamp as an integer (1-12).

### `x: time`

The timestamp from which to extract the month.

## Examples

### Extract the month from a timestamp

```tql
from {
  ts: 2024-06-15T14:30:45.123456,
}
month = ts.month()
```

```tql
{
  ts: 2024-06-15T14:30:45.123456,
  month: 6,
}
```

## See Also

* [`year`](https://tenzir.com/docs/reference/functions/year.md)
* [`day`](https://tenzir.com/docs/reference/functions/day.md)
* [`hour`](https://tenzir.com/docs/reference/functions/hour.md)
* [`minute`](https://tenzir.com/docs/reference/functions/minute.md)
* [`second`](https://tenzir.com/docs/reference/functions/second.md)
* [Calculate with time](../../guides/shape/calculate-with-time.md)
