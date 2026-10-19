---
title: "replace"
canonical: https://tenzir.com/docs/reference/functions/replace
source: https://tenzir.com/docs/reference/functions/replace.md
section: "Docs"
---

# replace

> Replaces literal substrings within a string.

Replaces literal substrings within a string.

```tql
replace(x:string, pattern:string, replacement:string, [max=int], [ignore_case=bool]) -> string
```

## Description

The `replace` function returns a new string where occurrences of `pattern` in `x` are replaced with `replacement`, up to `max` times. If `max` is omitted, all occurrences are replaced.

`pattern` and `replacement` can be fields or other expressions. The function evaluates them separately for every input event. If `pattern` evaluates to an empty string or `null`, the function leaves `x` unchanged. If `replacement` evaluates to `null`, the function removes matching patterns, as if the replacement were an empty string. If `x` evaluates to `null`, the function returns `null`.

Set `ignore_case=true` to match using full Unicode case folding instead of case-sensitive matching.

### `x: string`

The subject to replace the action on.

### `pattern: string`

The pattern to replace in `x`.

### `replacement: string`

The replacement value for `pattern`.

### `max = int (optional)`

The maximum number of replacements to perform.

If the option is not set, all occurrences are replaced.

### `ignore_case: bool` (optional)

If `true`, matches the literal `pattern` using full Unicode case folding.

Defaults to `false`.

## Examples

### Replace all occurrences of a character

```tql
from {x: "hello".replace("l", "r")}
```

```tql
{x: "herro"}
```

### Replace a limited number of occurrences

```tql
from {x: "hello".replace("l", "r", max=1)}
```

```tql
{x: "herlo"}
```

### Replace using a field value

Use a field as the pattern to redact a normalized email address from an OCSF `raw_data` field.

```tql
from {
  raw_data: "Authentication succeeded for alice@example.com",
  user: {email_addr: "alice@example.com"},
}


raw_data = raw_data.replace(user.email_addr, "***")
```

```tql
{
  raw_data: "Authentication succeeded for ***",
  user: {email_addr: "alice@example.com"},
}
```

### Replace case-insensitively

```tql
from {
  ascii: "Connection ERROR".replace("error", "warning", ignore_case=true),
  unicode: "Fußstraße".replace("STRASSE", "weg", ignore_case=true),
}
```

```tql
{
  ascii: "Connection warning",
  unicode: "Fußweg",
}
```

## See Also

* [`replace_regex`](https://tenzir.com/docs/reference/functions/replace_regex.md)
* [`replace`](https://tenzir.com/docs/reference/operators/replace.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
