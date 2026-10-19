---
title: "model_divergence"
canonical: https://tenzir.com/docs/reference/functions/model_divergence
source: https://tenzir.com/docs/reference/functions/model_divergence.md
section: "Docs"
---

# model_divergence

> Computes a divergence between compatible statistical models.

Computes a divergence between compatible statistical models.

```tql
model_divergence(p:record, q:record, method=string) -> float
```

## Description

The `method` argument must be the constant string `"jensen_shannon"`. It computes the [Jensen-Shannon divergence](https://en.wikipedia.org/wiki/Jensen%E2%80%93Shannon_divergence). The function supports histograms with identical represented edges and frequency tables. Frequency-table comparison aligns the union of values in both models.

The result uses natural logarithms and ranges from `0.0` to `ln(2)`. It returns null when either distribution is empty. Malformed or incompatible models produce a warning and return null.

### Definition

For normalized masses $p_i$ and $q_i$ on a common support, let $m_i=(p_i+q_i)/2$. The function computes

$$
\operatorname{JSD}(P,Q) = \frac{1}{2}\sum_i p_i\ln\frac{p_i}{m_i} + \frac{1}{2}\sum_i q_i\ln\frac{q_i}{m_i}.
$$

A zero-mass term contributes zero. Histogram masses are the underflow count, every regular-bin count, and the overflow count, each divided by model `count`. The histograms must have identical stored edges. Frequency-table masses use the union of exact values from both tables; a missing value has zero mass. Tiny negative results from floating-point rounding clamp to zero.

Derive Jensen-Shannon distance with `sqrt`:

```tql
distance = sqrt(model_divergence(p, q, method="jensen_shannon"))
```

## Examples

```tql
from {}
baseline = frequency_table(["success", "success", "failure"])
current = frequency_table(["success", "failure", "failure"])
select drift = model_divergence(
  baseline, current, method="jensen_shannon")
```

## See also

* [`model_distance`](https://tenzir.com/docs/reference/functions/model_distance.md)
* [`histogram`](https://tenzir.com/docs/reference/functions/histogram.md)
* [`frequency_table`](https://tenzir.com/docs/reference/functions/frequency_table.md)
