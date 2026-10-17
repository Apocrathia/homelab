---
title: "is_alpha"
canonical: https://tenzir.com/docs/reference/functions/is_alpha
source: https://tenzir.com/docs/reference/functions/is_alpha.md
section: "Docs"
---

# is_alpha

> Checks if a string contains only alphabetic characters.

Checks if a string contains only alphabetic characters.

```tql
is_alpha(x:string) -> bool
```

## Description

The `is_alpha` function returns `true` if `x` contains only alphabetic characters and `false` otherwise.

## Examples

### Check if a string is alphabetic

```tql
from {x: "hello".is_alpha()}
```

```tql
{x: true}
```

## See Also

* [`is_alnum`](https://tenzir.com/docs/reference/functions/is_alnum.md)
* [`is_lower`](https://tenzir.com/docs/reference/functions/is_lower.md)
* [`is_numeric`](https://tenzir.com/docs/reference/functions/is_numeric.md)
* [`is_printable`](https://tenzir.com/docs/reference/functions/is_printable.md)
* [`is_upper`](https://tenzir.com/docs/reference/functions/is_upper.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
