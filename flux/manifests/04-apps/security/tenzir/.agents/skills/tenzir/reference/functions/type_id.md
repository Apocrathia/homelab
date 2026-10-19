---
title: "type_id"
canonical: https://tenzir.com/docs/reference/functions/type_id
source: https://tenzir.com/docs/reference/functions/type_id.md
section: "Docs"
---

# type_id

> Retrieves the type id of an expression.

Retrieves the type id of an expression.

```tql
type_id(x:any) -> string
```

## Description

The `type_id` function returns the type id of the given value `x`.

## Examples

### Retrieve the type of a numeric expression

```tql
from {x: type_id(1 + 3.2)}
```

```tql
{x: "e268529445e27ad0"}
```

## See Also

* [`type_of`](https://tenzir.com/docs/reference/functions/type_of.md)
