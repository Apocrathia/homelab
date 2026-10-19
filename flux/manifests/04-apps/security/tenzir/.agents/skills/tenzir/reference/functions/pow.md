---
title: "pow"
canonical: https://tenzir.com/docs/reference/functions/pow
source: https://tenzir.com/docs/reference/functions/pow.md
section: "Docs"
---

# pow

> Raises a number to a power.

Raises a number to a power.

```tql
pow(base:number, exponent:number) -> float
pow(base:int, exponent:int) -> int
```

## Description

The `pow` function raises `base` to the power `exponent`. When both arguments are integers, `pow` returns an integer. Integer exponents must be non-negative, and integer overflow produces `null`.

## Examples

### Raise a number to an integer power

```tql
from {x: pow(2, 10)}
```

```tql
{x: 1024}
```

### Compute a root

```tql
from {x: pow(9, 0.5)}
```

```tql
{x: 3.0}
```
