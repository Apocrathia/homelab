---
title: "length_chars"
canonical: https://tenzir.com/docs/reference/functions/length_chars
source: https://tenzir.com/docs/reference/functions/length_chars.md
section: "Docs"
---

# length_chars

> Returns the length of a string in characters.

Returns the length of a string in characters.

```tql
length_chars(x:string) -> int
```

## Description

The `length_chars` function returns the character length of the `x` string.

## Examples

### Get the character length of a string

For ASCII strings, the character length is the same as the number of bytes:

```tql
from {x: "hello".length_chars()}
```

```tql
{x: 5}
```

For Unicode, this may not be the case:

```tql
from {x: "👻".length_chars()}
```

```tql
{x: 1}
```

## See Also

* [`length`](https://tenzir.com/docs/reference/functions/length.md)
* [`length_bytes`](https://tenzir.com/docs/reference/functions/length_bytes.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
