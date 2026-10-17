---
title: "mode"
canonical: https://tenzir.com/docs/reference/functions/mode
source: https://tenzir.com/docs/reference/functions/mode.md
section: "Docs"
---

# mode

> Takes the most common non-null grouped value.

Takes the most common non-null grouped value.

```tql
mode(xs:list) -> any
```

## Description

The `mode` function returns the most frequently occurring non-null value in `xs`.

### `xs: list`

The values to evaluate.

## Examples

### Find the mode of values

```tql
from {x: 1}, {x: 1}, {x: 2}, {x: 3}
summarize mode_value=mode(x)
```

```tql
{mode_value: 1}
```

## See Also

* [`median`](https://tenzir.com/docs/reference/functions/median.md)
* [`value_counts`](https://tenzir.com/docs/reference/functions/value_counts.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
