---
title: "is_title"
canonical: https://tenzir.com/docs/reference/functions/is_title
source: https://tenzir.com/docs/reference/functions/is_title.md
section: "Docs"
---

# is_title

> Checks if a string follows title case.

Checks if a string follows title case.

```tql
is_title(x:string) -> bool
```

## Description

The `is_title` function returns `true` if `x` is in title case and `false` otherwise.

## Examples

### Check if a string is in title case

```tql
from {x: "Hello World".is_title()}
```

```tql
{x: true}
```

## See Also

* [`to_title`](https://tenzir.com/docs/reference/functions/to_title.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
