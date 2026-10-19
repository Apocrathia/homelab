---
title: "ends_with"
canonical: https://tenzir.com/docs/reference/functions/ends_with
source: https://tenzir.com/docs/reference/functions/ends_with.md
section: "Docs"
---

# ends_with

> Checks whether a string ends with a specified substring.

Checks whether a string ends with a specified substring.

```tql
ends_with(x:string, suffix:string, [ignore_case=bool]) -> bool
```

## Description

The `ends_with` function returns `true` if `x` ends with `suffix` and `false` otherwise.

Set `ignore_case=true` to compare using full Unicode case folding instead of case-sensitive matching.

## Examples

### Check if a string ends with a substring

```tql
from {x: "hello".ends_with("lo")}
```

```tql
{x: true}
```

### Compare case-insensitively

```tql
from {
  ascii: "/API/v1/Users".ends_with("USERS", ignore_case=true),
  unicode: "Fußstraße".ends_with("STRASSE", ignore_case=true),
}
```

```tql
{
  ascii: true,
  unicode: true,
}
```

## See Also

* [`starts_with`](https://tenzir.com/docs/reference/functions/starts_with.md)
* [Filter and select data](../../guides/optimize/filter-and-select-data.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
