---
title: "is_upper"
canonical: https://tenzir.com/docs/reference/functions/is_upper
source: https://tenzir.com/docs/reference/functions/is_upper.md
section: "Docs"
---

# is_upper

> Checks if a string is in uppercase.

Checks if a string is in uppercase.

```tql
is_upper(x:string) -> bool
```

## Description

The `is_upper` function returns `true` if `x` is entirely in uppercase; otherwise, it returns `false`.

## Examples

### Check if a string is uppercase

```tql
from {x: "HELLO".is_upper()}
```

```tql
{x: true}
```

## See Also

* [`is_alpha`](https://tenzir.com/docs/reference/functions/is_alpha.md)
* [`is_lower`](https://tenzir.com/docs/reference/functions/is_lower.md)
* [`to_upper`](https://tenzir.com/docs/reference/functions/to_upper.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
