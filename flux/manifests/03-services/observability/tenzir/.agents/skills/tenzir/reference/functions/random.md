---
title: "random"
canonical: https://tenzir.com/docs/reference/functions/random
source: https://tenzir.com/docs/reference/functions/random.md
section: "Docs"
---

# random

> Generates a random number in \[0,1].

Generates a random number in *\[0,1]*.

```tql
random() -> float
```

## Description

The `random` function generates a random number by drawing from a [uniform distribution](https://en.wikipedia.org/wiki/Continuous_uniform_distribution) in the interval *\[0,1]*.

## Examples

### Generate a random number

```tql
from {x: random()}
```

```tql
{x: 0.19634716885782455}
```

## See Also

* [`uuid`](https://tenzir.com/docs/reference/functions/uuid.md)
* [Plot data with charts](../../tutorials/plot-data-with-charts.md)
