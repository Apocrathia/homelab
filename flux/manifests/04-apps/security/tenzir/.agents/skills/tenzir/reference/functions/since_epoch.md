---
title: "since_epoch"
canonical: https://tenzir.com/docs/reference/functions/since_epoch
source: https://tenzir.com/docs/reference/functions/since_epoch.md
section: "Docs"
---

# since_epoch

> Interprets a time value as duration since the Unix epoch.

Interprets a time value as duration since the Unix epoch.

```tql
since_epoch(x:time) -> duration
```

## Description

The `since_epoch` function turns a time value into a duration since the [Unix epoch](https://en.wikipedia.org/wiki/Unix_time), i.e., since 00:00:00 UTC on January 1970.

## Examples

### Retrive the Unix time for a given date

```tql
from { x: since_epoch(2021-02-24) }
```

```tql
{x: 18682.0d}
```

## See Also

* [`from_epoch`](https://tenzir.com/docs/reference/functions/from_epoch.md)
* [`now`](https://tenzir.com/docs/reference/functions/now.md)
* [Calculate with time](../../guides/shape/calculate-with-time.md)
