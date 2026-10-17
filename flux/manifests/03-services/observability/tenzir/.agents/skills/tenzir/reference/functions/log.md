---
title: "log"
canonical: https://tenzir.com/docs/reference/functions/log
source: https://tenzir.com/docs/reference/functions/log.md
section: "Docs"
---

# log

> Computes a logarithm with an optional base.

Computes a logarithm with an optional base.

```tql
log(x:number) -> float
log(x:number, base:number) -> float
```

## Description

Without `base`, the `log` function computes the natural logarithm of `x` with base $e$. Provide `base` to compute a logarithm with an arbitrary base.

A logarithm has a finite real result when `x` is positive and `base` is finite, positive, and not equal to `1`.

## Examples

### Compute the natural logarithm

```tql
from {x: log(exp(1))}
```

```tql
{x: 1.0}
```

### Select the logarithm base

```tql
from {
  binary: log(8, 2),
  decimal: log(1000, 10),
  arbitrary: log(25, 5),
}
```

```tql
{
  binary: 3.0,
  decimal: 3.0,
  arbitrary: 2.0,
}
```
