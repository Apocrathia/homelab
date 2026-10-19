---
title: "histogram_bucket"
canonical: https://tenzir.com/docs/reference/functions/histogram_bucket
source: https://tenzir.com/docs/reference/functions/histogram_bucket.md
section: "Docs"
---

# histogram_bucket

> Returns the histogram bucket containing a value.

Returns the histogram bucket containing a value.

```tql
histogram_bucket(model:record, x:number) -> record
```

## Description

The `histogram_bucket` function looks up the bucket of a histogram model that contains the query value `x`. The model comes from the [`histogram`](https://tenzir.com/docs/reference/functions/histogram.md) aggregation function or any typed record with the same shape, such as a model loaded from a lookup table.

### Definition

For stored edges $e_0 < \dots < e_b$, the returned index is

$$
\operatorname{bucket}(x) = \begin{cases} -1 & x < e_0,\\ \max\{i : e_i \le x\} & e_0 \le x < e_b,\\ b-1 & x = e_b,\\ b & x > e_b. \end{cases}
$$

Indices $0$ through $b-1$ are regular bins, while $-1$ and $b$ denote the two tails. The lookup uses binary search over the stored edges and therefore takes $O(\log b)$ comparisons.

The result has this shape:

```tql
{
  kind: "underflow" | "regular" | "overflow",
  index: int,     // -1 for underflow, number of bins for overflow
  lower: float,   // null for underflow
  upper: float,   // null for overflow
  count: uint,
}
```

The final bin edge belongs to the final regular bin; a value must be greater than it to select the overflow bucket. An empty model yields a valid bucket with `count == 0`.

The function returns null for a null or non-finite query value, and returns null with a warning for a malformed or unsupported model.

### `model: record`

The histogram model to query.

### `x: number`

The value to look up.

## Examples

### Find the bucket of a value

```tql
from {}
m = histogram([1.0, 3.0, 4.0, 12.0], bins=4, width=2.5)
select bucket = histogram_bucket(m, 3)
```

```tql
{
  bucket: {
    kind: "regular",
    index: 1,
    lower: 2.5,
    upper: 5.0,
    count: 2,
  },
}
```

## See Also

* [`histogram`](https://tenzir.com/docs/reference/functions/histogram.md)
