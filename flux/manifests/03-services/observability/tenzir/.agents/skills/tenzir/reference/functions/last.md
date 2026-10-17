---
title: "last"
canonical: https://tenzir.com/docs/reference/functions/last
source: https://tenzir.com/docs/reference/functions/last.md
section: "Docs"
---

# last

> Takes the last non-null grouped value.

Takes the last non-null grouped value.

```tql
last(xs:list) -> any
```

## Description

The `last` function returns the last non-null value in `xs`.

### `xs: list`

The values to search.

## Examples

### Get the last non-null value

```tql
from {x: 1}, {x: 2}, {x: null}
summarize last_value=last(x)
```

```tql
{last_value: 2}
```

## See Also

* [`first`](https://tenzir.com/docs/reference/functions/first.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
