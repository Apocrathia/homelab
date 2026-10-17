---
title: "length_bytes"
canonical: https://tenzir.com/docs/reference/functions/length_bytes
source: https://tenzir.com/docs/reference/functions/length_bytes.md
section: "Docs"
---

# length_bytes

> Returns the length of a string in bytes.

Returns the length of a string in bytes.

```tql
length_bytes(x:string) -> int
```

## Description

The `length_bytes` function returns the byte length of the `x` string.

## Examples

### Get the byte length of a string

For ASCII strings, the byte length is the same as the number of characters:

```tql
from {x: "hello".length_bytes()}
```

```tql
{x: 5}
```

For Unicode, this may not be the case:

```tql
from {x: "👻".length_bytes()}
```

```tql
{x: 4}
```

## See Also

* [`length`](https://tenzir.com/docs/reference/functions/length.md)
* [`length_chars`](https://tenzir.com/docs/reference/functions/length_chars.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
