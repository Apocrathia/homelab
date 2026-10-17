---
title: "is_printable"
canonical: https://tenzir.com/docs/reference/functions/is_printable
source: https://tenzir.com/docs/reference/functions/is_printable.md
section: "Docs"
---

# is_printable

> Checks if a string contains only printable characters.

Checks if a string contains only printable characters.

```tql
is_printable(x:string) -> bool
```

## Description

The `is_printable` function returns `true` if `x` contains only printable characters and `false` otherwise.

## Examples

### Check if a string is printable

```tql
from {x: "hello".is_printable()}
```

```tql
{x: true}
```

## See Also

* [`is_alnum`](https://tenzir.com/docs/reference/functions/is_alnum.md)
* [`is_alpha`](https://tenzir.com/docs/reference/functions/is_alpha.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
