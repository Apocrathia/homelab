---
title: "shift_right"
canonical: https://tenzir.com/docs/reference/functions/shift_right
source: https://tenzir.com/docs/reference/functions/shift_right.md
section: "Docs"
---

# shift_right

> Performs a bit-wise right shift.

Performs a bit-wise right shift.

```tql
shift_right(lhs:number, rhs:number) -> number
```

## Description

The `shift_right` function performs a bit-wise right shift of `lhs` by `rhs` bit positions. Each right shift divides the number by 2, truncating any fractional part.

### `lhs: number`

The number to be shifted.

### `rhs: number`

The number of bit positions to shift to the right.

## Examples

### Shift bits to the right

```tql
from {x: shift_right(20, 2)}
```

```tql
{x: 5}
```

## See Also

* [`bit_and`](https://tenzir.com/docs/reference/functions/bit_and.md)
* [`bit_not`](https://tenzir.com/docs/reference/functions/bit_not.md)
* [`bit_or`](https://tenzir.com/docs/reference/functions/bit_or.md)
* [`bit_xor`](https://tenzir.com/docs/reference/functions/bit_xor.md)
* [`shift_left`](https://tenzir.com/docs/reference/functions/shift_left.md)
