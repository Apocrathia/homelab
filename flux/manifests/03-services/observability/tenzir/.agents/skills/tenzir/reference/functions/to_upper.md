---
title: "to_upper"
canonical: https://tenzir.com/docs/reference/functions/to_upper
source: https://tenzir.com/docs/reference/functions/to_upper.md
section: "Docs"
---

# to_upper

> Converts a string to uppercase.

Converts a string to uppercase.

```tql
to_upper(x:string) -> string
```

## Description

The `to_upper` function converts all characters in `x` to uppercase.

## Examples

### Convert a string to uppercase

```tql
from {x: "hello".to_upper()}
```

```tql
{x: "HELLO"}
```

## See Also

* [`capitalize`](https://tenzir.com/docs/reference/functions/capitalize.md)
* [`is_upper`](https://tenzir.com/docs/reference/functions/is_upper.md)
* [`to_lower`](https://tenzir.com/docs/reference/functions/to_lower.md)
* [`to_title`](https://tenzir.com/docs/reference/functions/to_title.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
