---
title: "bit_xor"
canonical: https://tenzir.com/docs/reference/functions/bit_xor
source: https://tenzir.com/docs/reference/functions/bit_xor.md
section: "Docs"
---

# bit_xor

> Computes the bit-wise XOR of its arguments.

Computes the bit-wise XOR of its arguments.

```tql
bit_xor(lhs:number, rhs:number) -> number
```

## Description

The `bit_xor` function computes the bit-wise XOR (exclusive OR) of `lhs` and `rhs`. The operation is performed on each corresponding bit position of the two numbers.

### `lhs: number`

The left-hand side operand.

### `rhs: number`

The right-hand side operand.

## Examples

### Perform bit-wise XOR on integers

```tql
from {x: bit_xor(5, 3)}
```

```tql
{x: 6}
```

## See Also

* [`bit_and`](https://tenzir.com/docs/reference/functions/bit_and.md)
* [`bit_not`](https://tenzir.com/docs/reference/functions/bit_not.md)
* [`bit_or`](https://tenzir.com/docs/reference/functions/bit_or.md)
* [`shift_left`](https://tenzir.com/docs/reference/functions/shift_left.md)
* [`shift_right`](https://tenzir.com/docs/reference/functions/shift_right.md)
