---
title: "uint"
canonical: https://tenzir.com/docs/reference/functions/uint
source: https://tenzir.com/docs/reference/functions/uint.md
section: "Docs"
---

# uint

> Casts an expression to an unsigned integer.

Casts an expression to an unsigned integer.

```tql
uint(x:number|string, base=int) -> uint
```

## Description

The `uint` function casts the provided value `x` to an unsigned integer. Non-integer values are truncated.

### `x: number|string`

The input to convert.

### `base = int`

Base (radix) to parse a string as. Can be `10` or `16`.

If `16`, the string inputs may be optionally prefixed by `0x` or `0X`, e.g., `0x134`.

Defaults to `10`.

## Examples

### Cast a floating-point number to an unsigned integer

```tql
from {x: uint(4.2)}
```

```tql
{x: 4}
```

### Parse a hexadecimal number

```tql
from {x: uint("0x42", base=16)}
```

```tql
{x: 66}
```

## See Also

* [`float`](https://tenzir.com/docs/reference/functions/float.md)
* [`int`](https://tenzir.com/docs/reference/functions/int.md)
* [`ip`](https://tenzir.com/docs/reference/functions/ip.md)
* [`string`](https://tenzir.com/docs/reference/functions/string.md)
* [`subnet`](https://tenzir.com/docs/reference/functions/subnet.md)
* [`time`](https://tenzir.com/docs/reference/functions/time.md)
