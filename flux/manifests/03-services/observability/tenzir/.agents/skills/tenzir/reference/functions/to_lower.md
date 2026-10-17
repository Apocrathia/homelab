---
title: "to_lower"
canonical: https://tenzir.com/docs/reference/functions/to_lower
source: https://tenzir.com/docs/reference/functions/to_lower.md
section: "Docs"
---

# to_lower

> Converts a string to lowercase.

Converts a string to lowercase.

```tql
to_lower(x:string) -> string
```

## Description

The `to_lower` function converts all characters in `x` to lowercase.

## Examples

### Convert a string to lowercase

```tql
from {x: "HELLO".to_lower()}
```

```tql
{x: "hello"}
```

## See Also

* [`capitalize`](https://tenzir.com/docs/reference/functions/capitalize.md)
* [`is_lower`](https://tenzir.com/docs/reference/functions/is_lower.md)
* [`to_title`](https://tenzir.com/docs/reference/functions/to_title.md)
* [`to_upper`](https://tenzir.com/docs/reference/functions/to_upper.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
