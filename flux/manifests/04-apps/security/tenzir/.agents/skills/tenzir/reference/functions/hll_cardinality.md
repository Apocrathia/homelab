---
title: "hll_cardinality"
canonical: https://tenzir.com/docs/reference/functions/hll_cardinality
source: https://tenzir.com/docs/reference/functions/hll_cardinality.md
section: "Docs"
---

# hll_cardinality

> Estimates the distinct cardinality of a HyperLogLog model.

Estimates the distinct cardinality of a [HyperLogLog](https://en.wikipedia.org/wiki/HyperLogLog) model.

```tql
hll_cardinality(model:record) -> uint
```

## Description

The `hll_cardinality` function returns a rounded estimate. It returns `0` for a valid empty model. A malformed model produces a warning and returns null.

### Definition

For $m$ registers with ranks $M_j$, the raw estimate is

$$
E = \alpha_m \frac{m^2}{\sum_{j=0}^{m-1} 2^{-M_j}},
$$

where $\alpha_{16}=0.673$, $\alpha_{32}=0.697$, $\alpha_{64}=0.709$, and

$$
\alpha_m = \frac{0.7213}{1 + 1.079/m}
$$

for larger $m$. If $E \le 2.5m$ and $V$ registers are zero, the implementation uses linear counting instead:

$$
E = m\ln(m/V).
$$

For $E > 2^{64}/30$, it applies the 64-bit hash-space correction

$$
E = -2^{64}\ln\left(1 - E/2^{64}\right).
$$

The function rounds the final estimate to the nearest `uint` and saturates at the largest `uint` when necessary.

## Examples

```tql
from {}
model = hll(["alice", "bob", "alice"])
select users = hll_cardinality(model)
```

```tql
{users: 2}
```

## See also

* [`hll`](https://tenzir.com/docs/reference/functions/hll.md)
* [`model_merge`](https://tenzir.com/docs/reference/functions/model_merge.md)
