---
title: "is_lower"
canonical: https://tenzir.com/docs/reference/functions/is_lower
source: https://tenzir.com/docs/reference/functions/is_lower.md
section: "Docs"
---

# is_lower

> Checks if a string is in lowercase.

Checks if a string is in lowercase.

```tql
is_lower(x:string) -> bool
```

## Description

The `is_lower` function returns `true` if `x` is entirely in lowercase and `false` otherwise.

## Examples

### Check if a string is lowercase

```tql
from {x: "hello".is_lower()}
```

```tql
{x: true}
```

## See Also

* [`is_alpha`](https://tenzir.com/docs/reference/functions/is_alpha.md)
* [`is_upper`](https://tenzir.com/docs/reference/functions/is_upper.md)
* [`to_lower`](https://tenzir.com/docs/reference/functions/to_lower.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
