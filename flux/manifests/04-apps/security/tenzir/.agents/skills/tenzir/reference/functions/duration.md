---
title: "duration"
canonical: https://tenzir.com/docs/reference/functions/duration
source: https://tenzir.com/docs/reference/functions/duration.md
section: "Docs"
---

# duration

> Casts an expression to a duration value.

Casts an expression to a duration value.

```tql
duration(x:string) -> duration
```

## Description

The `duration` function casts the given string `x` to a duration value.

## Examples

### Cast a string to a duration

```tql
from {str: "1ms"}
dur = duration(str)
```

```tql
{str: "1ms", dur: 1ms}
```

## See Also

* [`time`](https://tenzir.com/docs/reference/functions/time.md)
* [Calculate with time](../../guides/shape/calculate-with-time.md)
