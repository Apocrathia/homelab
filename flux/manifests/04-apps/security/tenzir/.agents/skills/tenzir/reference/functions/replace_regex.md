---
title: "replace_regex"
canonical: https://tenzir.com/docs/reference/functions/replace_regex
source: https://tenzir.com/docs/reference/functions/replace_regex.md
section: "Docs"
---

# replace_regex

> Replaces characters within a string based on a regular expression.

Replaces characters within a string based on a regular expression.

```tql
replace_regex(x:string, pattern:string, replacement:string, [max=int]) -> string
```

## Description

The `replace_regex` function returns a new string where substrings in `x` that match `pattern` are replaced with `replacement`, up to `max` times. If `max` is omitted, all matches are replaced.

An empty regular expression matches at every string boundary. For example, `"abc".replace_regex("", "-")` returns `"-a-b-c-"`. In contrast, an empty literal pattern passed to [`replace`](https://tenzir.com/docs/reference/functions/replace.md) leaves the subject unchanged.

### `x: string`

The subject to replace the action on.

### `pattern: string`

The pattern (as regular expression) to replace in `x`.

### `replacement: string`

The replacement value for `pattern`.

### `max = int (optional)`

The maximum number of replacements to perform.

If the option is not set, all occurrences are replaced.

## Examples

### Replace all matches of a regular expression

```tql
from {x: replace_regex("hello", "l+", "y")}
```

```tql
{x: "heyo"}
```

### Replace a limited number of matches

```tql
from {x: replace_regex("hellolo", "l+", "y", max=1)}
```

```tql
{x: "heyolo"}
```

## See Also

* [`replace`](https://tenzir.com/docs/reference/functions/replace.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
* [Mask sensitive data](../../guides/protect/mask-sensitive-data.md)
