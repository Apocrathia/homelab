---
title: "any"
canonical: https://tenzir.com/docs/reference/functions/any
source: https://tenzir.com/docs/reference/functions/any.md
section: "Docs"
---

# any

> Computes the disjunction (OR) of all grouped boolean values.

Computes the disjunction (OR) of all grouped boolean values.

```tql
any(xs:list) -> bool
```

## Description

The `any` function returns `true` if any value in `xs` is `true` and `false` otherwise.

### `xs: list`

A list of boolean values.

## Examples

### Check if any value is true

```tql
from {x: false}, {x: false}, {x: true}
summarize result=any(x)
```

```tql
{result: true}
```

## See Also

* [`all`](https://tenzir.com/docs/reference/functions/all.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
