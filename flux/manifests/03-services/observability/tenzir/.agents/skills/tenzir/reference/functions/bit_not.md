---
title: "bit_not"
canonical: https://tenzir.com/docs/reference/functions/bit_not
source: https://tenzir.com/docs/reference/functions/bit_not.md
section: "Docs"
---

# bit_not

> Computes the bit-wise NOT of its argument.

Computes the bit-wise NOT of its argument.

```tql
bit_not(x:number) -> number
```

## Description

The `bit_not` function computes the bit-wise NOT of `x`. The operation inverts each bit in the binary representation of the number.

### `x: number`

The number to perform bit-wise NOT on.

## Examples

### Perform bit-wise NOT on an integer

```tql
from {x: bit_not(5)}
```

```tql
{x: -6}
```

## See Also

* [`bit_and`](https://tenzir.com/docs/reference/functions/bit_and.md)
* [`bit_or`](https://tenzir.com/docs/reference/functions/bit_or.md)
* [`bit_xor`](https://tenzir.com/docs/reference/functions/bit_xor.md)
* [`shift_left`](https://tenzir.com/docs/reference/functions/shift_left.md)
* [`shift_right`](https://tenzir.com/docs/reference/functions/shift_right.md)
