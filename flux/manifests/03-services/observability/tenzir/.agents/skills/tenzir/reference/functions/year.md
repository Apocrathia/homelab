---
title: "year"
canonical: https://tenzir.com/docs/reference/functions/year
source: https://tenzir.com/docs/reference/functions/year.md
section: "Docs"
---

# year

> Extracts the year component from a timestamp.

Extracts the year component from a timestamp.

```tql
year(x: time) -> int
```

## Description

The `year` function extracts the year component from a timestamp as an integer.

### `x: time`

The timestamp from which to extract the year.

## Examples

### Extract the year from a timestamp

```tql
from {
  ts: 2024-06-15T14:30:45.123456,
}
year = ts.year()
```

```tql
{
  ts: 2024-06-15T14:30:45.123456,
  year: 2024,
}
```

## See Also

* [`month`](https://tenzir.com/docs/reference/functions/month.md)
* [`day`](https://tenzir.com/docs/reference/functions/day.md)
* [`hour`](https://tenzir.com/docs/reference/functions/hour.md)
* [`minute`](https://tenzir.com/docs/reference/functions/minute.md)
* [`second`](https://tenzir.com/docs/reference/functions/second.md)
* [Calculate with time](../../guides/shape/calculate-with-time.md)
* [Mask sensitive data](../../guides/protect/mask-sensitive-data.md)
