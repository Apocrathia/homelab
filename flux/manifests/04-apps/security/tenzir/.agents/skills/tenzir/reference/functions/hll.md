---
title: "hll"
canonical: https://tenzir.com/docs/reference/functions/hll
source: https://tenzir.com/docs/reference/functions/hll.md
section: "Docs"
---

# hll

> Builds a mergeable HyperLogLog model for approximate distinct counts.

Builds a mergeable HyperLogLog model for approximate distinct counts.

```tql
hll(xs:list, [precision=uint]) -> record
```

## Description

The `hll` function builds a [HyperLogLog](https://en.wikipedia.org/wiki/HyperLogLog) sketch from every non-null TQL value. It uses bounded memory and tracks duplicate observations in `count` without increasing the estimated cardinality.

### Definition

Let $p$ be `precision`, $m = 2^p$, and $h(x)$ the model’s type-tagged 64-bit XXH3 hash. The leading $p$ bits select register

$$
j = \left\lfloor \frac{h(x)}{2^{64-p}} \right\rfloor.
$$

Let $\rho(x)$ be one plus the number of leading zero bits in the remaining $64-p$ bits, capped at $65-p$. Each observation updates only

$$
M_j \leftarrow \max(M_j, \rho(x)).
$$

All registers start at zero. Since one observation updates at most one register, every valid model satisfies

$$
\left|\{j : M_j > 0\}\right| \le \text{count},
$$

and all registers are zero exactly when `count` is zero. Merging compatible models takes the element-wise maximum. Hashing includes the TQL value’s type tag, so `42`, `42u`, and `42.0` are distinct observations.

### `precision = uint (optional)`

Controls the register count and estimation error. The value must be between 4 and 18 and defaults to `14`. The model contains `2^precision` registers.

## Result

```tql
{
  model: "hll",
  version: 1,
  input_count: uint,
  count: uint,
  null_count: uint,
  precision: uint,
  hash: string,
  registers: [uint, ...],
}
```

## Examples

### Estimate distinct users

```tql
from {user: "alice"}, {user: "bob"}, {user: "alice"}
summarize model = hll(user)
select users = hll_cardinality(model)
```

```tql
{users: 2}
```

## See also

* [`hll_cardinality`](https://tenzir.com/docs/reference/functions/hll_cardinality.md)
* [`model_merge`](https://tenzir.com/docs/reference/functions/model_merge.md)
* [`count_distinct`](https://tenzir.com/docs/reference/functions/count_distinct.md)
