---
title: "repeat"
canonical: https://tenzir.com/docs/reference/functions/repeat
source: https://tenzir.com/docs/reference/functions/repeat.md
section: "Docs"
---

# repeat

> Repeats a string a specified number of times.

Repeats a string a specified number of times.

```tql
repeat(x:string, n:int) -> string
```

## Description

The `repeat` function returns a new string consisting of `x` repeated `n` times. If `n` is `0`, the function returns an empty string.

### `x: string`

The string to repeat.

### `n: int`

The number of times to repeat `x`. Must be non-negative.

## Examples

### Repeat a string

```tql
from {message: "na".repeat(8)}
```

```tql
{message: "nananananananana"}
```

### Repeat zero times

```tql
from {message: "na".repeat(0)}
```

```tql
{message: ""}
```

## See Also

* [`pad_end`](https://tenzir.com/docs/reference/functions/pad_end.md)
* [`pad_start`](https://tenzir.com/docs/reference/functions/pad_start.md)
* [`replace`](https://tenzir.com/docs/reference/functions/replace.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
