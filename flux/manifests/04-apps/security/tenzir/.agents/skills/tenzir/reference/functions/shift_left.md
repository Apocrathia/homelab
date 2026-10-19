---
title: "shift_left"
canonical: https://tenzir.com/docs/reference/functions/shift_left
source: https://tenzir.com/docs/reference/functions/shift_left.md
section: "Docs"
---

# shift_left

> Performs a bit-wise left shift.

Performs a bit-wise left shift.

```tql
shift_left(lhs:number, rhs:number) -> number
```

## Description

The `shift_left` function performs a bit-wise left shift of `lhs` by `rhs` bit positions. Each left shift multiplies the number by 2.

### `lhs: number`

The number to be shifted.

### `rhs: number`

The number of bit positions to shift to the left.

## Examples

### Shift bits to the left

```tql
from {x: shift_left(5, 2)}
```

```tql
{x: 20}
```

## See Also

* [`bit_and`](https://tenzir.com/docs/reference/functions/bit_and.md)
* [`bit_not`](https://tenzir.com/docs/reference/functions/bit_not.md)
* [`bit_or`](https://tenzir.com/docs/reference/functions/bit_or.md)
* [`bit_xor`](https://tenzir.com/docs/reference/functions/bit_xor.md)
* [`shift_right`](https://tenzir.com/docs/reference/functions/shift_right.md)
