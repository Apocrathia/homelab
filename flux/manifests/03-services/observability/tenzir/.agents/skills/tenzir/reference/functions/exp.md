---
title: "exp"
canonical: https://tenzir.com/docs/reference/functions/exp
source: https://tenzir.com/docs/reference/functions/exp.md
section: "Docs"
---

# exp

> Computes the natural exponential function.

Computes the natural exponential function.

```tql
exp(x:number) -> float
```

## Description

The `exp` function raises Euler’s number $e$ to the power `x`.

## Examples

### Compute the natural exponential

```tql
from {x: exp(1)}
```

```tql
{x: 2.718281828459045}
```
