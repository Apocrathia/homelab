---
title: "trim_start"
canonical: https://tenzir.com/docs/reference/functions/trim_start
source: https://tenzir.com/docs/reference/functions/trim_start.md
section: "Docs"
---

# trim_start

> Trims whitespace or specified characters from the start of a string.

Trims whitespace or specified characters from the start of a string.

```tql
trim_start(x:string, [chars:string]) -> string
```

## Description

The `trim_start` function removes characters from the beginning of `x`.

When called with one argument, it removes leading whitespace. When called with two arguments, it removes any characters found in `chars` from the start of the string.

### `x: string`

The string to trim.

### `chars: string (optional)`

A string where each character represents a character to remove. Any character found in this string will be trimmed from the start.

Defaults to whitespace characters.

## Examples

### Trim whitespace from the start

```tql
from {x: " hello".trim_start()}
```

```tql
{x: "hello"}
```

### Trim specific characters

```tql
from {x: "/path/to/file".trim_start("/")}
```

```tql
{x: "path/to/file"}
```

### Trim multiple characters

```tql
from {x: "/-/hello".trim_start("/-")}
```

```tql
{x: "hello"}
```

## See Also

* [`trim`](https://tenzir.com/docs/reference/functions/trim.md)
* [`trim_end`](https://tenzir.com/docs/reference/functions/trim_end.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
