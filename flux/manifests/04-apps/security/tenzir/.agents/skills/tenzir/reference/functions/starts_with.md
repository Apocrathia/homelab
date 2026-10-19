---
title: "starts_with"
canonical: https://tenzir.com/docs/reference/functions/starts_with
source: https://tenzir.com/docs/reference/functions/starts_with.md
section: "Docs"
---

# starts_with

> Checks whether a string starts with a specified substring.

Checks whether a string starts with a specified substring.

```tql
starts_with(x:string, prefix:string, [ignore_case=bool]) -> bool
```

## Description

The `starts_with` function returns `true` if `x` starts with `prefix` and `false` otherwise.

Set `ignore_case=true` to compare using full Unicode case folding instead of case-sensitive matching.

## Examples

### Check if a string starts with a substring

```tql
from {x: "hello".starts_with("he")}
```

```tql
{x: true}
```

### Compare case-insensitively

```tql
from {
  ascii: "Get".starts_with("get", ignore_case=true),
  unicode: "STRASSE".starts_with("straße", ignore_case=true),
}
```

```tql
{
  ascii: true,
  unicode: true,
}
```

## See Also

* [`ends_with`](https://tenzir.com/docs/reference/functions/ends_with.md)
* [Filter and select data](../../guides/optimize/filter-and-select-data.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
* [Learn idiomatic TQL](../../tutorials/learn-idiomatic-tql.md)
