---
title: "equals"
canonical: https://tenzir.com/docs/reference/functions/equals
source: https://tenzir.com/docs/reference/functions/equals.md
section: "Docs"
---

# equals

> Checks whether two strings are equal.

Checks whether two strings are equal.

```tql
equals(x:string, y:string, [ignore_case=bool]) -> bool
```

## Description

The `equals` function returns `true` if `x` and `y` are equal and `false` otherwise.

Set `ignore_case=true` to compare using full Unicode case folding instead of case-sensitive matching.

### `x: string`

The left-hand string to compare.

### `y: string`

The right-hand string to compare.

### `ignore_case: bool` (optional)

If `true`, compares strings using full Unicode case folding.

Defaults to `false`.

## Examples

### Compare strings case-sensitively

```tql
from {
  same: equals("abc", "abc"),
  different: equals("abc", "ABC"),
}
```

```tql
{
  same: true,
  different: false,
}
```

### Compare strings case-insensitively

```tql
from {
  ascii: equals("Get", "GET", ignore_case=true),
  unicode: equals("STRASSE", "straße", ignore_case=true),
}
```

```tql
{
  ascii: true,
  unicode: true,
}
```

## See Also

* [`search`](https://tenzir.com/docs/reference/functions/search.md)
* [`ends_with`](https://tenzir.com/docs/reference/functions/ends_with.md)
* [`starts_with`](https://tenzir.com/docs/reference/functions/starts_with.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
