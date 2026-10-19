---
title: "jensen_shannon"
canonical: https://tenzir.com/docs/reference/functions/jensen_shannon
source: https://tenzir.com/docs/reference/functions/jensen_shannon.md
section: "Docs"
---

# jensen_shannon

> Computes the Jensen-Shannon divergence between aligned weight vectors.

Computes the Jensen-Shannon divergence between aligned weight vectors.

```tql
jensen_shannon(p:list, q:list) -> float
```

## Description

The `jensen_shannon` function compares two lists of finite, non-negative weights. The lists must have the same length, and entries at the same index must describe the same outcome. Each list must contain at least one positive weight. The function normalizes the weights, so they do not need to sum to one.

### Definition

For normalized masses $p_i$ and $q_i$, let $m_i=(p_i+q_i)/2$. The function computes

$$
\operatorname{JSD}(P,Q) = \frac{1}{2}\sum_i p_i\ln\frac{p_i}{m_i} + \frac{1}{2}\sum_i q_i\ln\frac{q_i}{m_i}.
$$

A zero-mass term contributes zero. The result uses natural logarithms and ranges from `0.0` to `ln(2)`.

The function returns null for a null list or a list without positive weight. Mismatched lengths, null elements, negative weights, and non-finite values produce a warning and return null.

## Examples

The vectors in this example count agent interactions, model requests, tool executions, and web fetches in that order:

```tql
from {}
select lifecycle_drift=jensen_shannon([3, 1, 1, 0], [1, 1, 2, 1])
```

```tql
{lifecycle_drift: 0.1386294361119891}
```

## See also

* [`model_divergence`](https://tenzir.com/docs/reference/functions/model_divergence.md)
* [`kolmogorov_smirnov`](https://tenzir.com/docs/reference/functions/kolmogorov_smirnov.md)
* [`wasserstein`](https://tenzir.com/docs/reference/functions/wasserstein.md)
