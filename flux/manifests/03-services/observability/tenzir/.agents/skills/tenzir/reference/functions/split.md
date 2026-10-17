---
title: "split"
canonical: https://tenzir.com/docs/reference/functions/split
source: https://tenzir.com/docs/reference/functions/split.md
section: "Docs"
---

# split

> Splits a string into substrings.

Splits a string into substrings.

```tql
split(x:string, pattern:string, [max=int], [reverse=bool], [ignore_case=bool]) -> list
```

## Description

The `split` function splits the input string `x` into a list of substrings using the specified `pattern`. Optional arguments allow limiting the number of splits (`max`), reversing the splitting direction (`reverse`), and matching the literal delimiter case-insensitively (`ignore_case`).

### `x: string`

The string to split.

### `pattern: string`

The delimiter or pattern used for splitting.

### `max: int (optional)`

The maximum number of splits to perform.

Defaults to `0`, meaning no limit.

### `reverse: bool (optional)`

If `true`, splits from the end of the string.

Defaults to `false`.

### `ignore_case: bool` (optional)

If `true`, matches the literal `pattern` using full Unicode case folding.

Defaults to `false`.

## Examples

### Split a string by a delimiter

```tql
from {xs: split("a,b,c", ",")}
```

```tql
{xs: ["a", "b", "c"]}
```

### Limit the number of splits

```tql
from {xs: split("a-b-c", "-", max=1)}
```

```tql
{xs: ["a", "b-c"]}
```

### Split case-insensitively

```tql
from {
  ascii: split("/API/v1/Users", "api", ignore_case=true),
  unicode: split("Fußstraße", "STRASSE", ignore_case=true),
}
```

```tql
{
  ascii: ["/", "/v1/Users"],
  unicode: ["Fuß", ""],
}
```

## See Also

* [`split_regex`](https://tenzir.com/docs/reference/functions/split_regex.md)
* [`join`](https://tenzir.com/docs/reference/functions/join.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
