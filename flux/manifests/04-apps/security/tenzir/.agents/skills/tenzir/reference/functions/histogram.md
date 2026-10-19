---
title: "histogram"
canonical: https://tenzir.com/docs/reference/functions/histogram
source: https://tenzir.com/docs/reference/functions/histogram.md
section: "Docs"
---

# histogram

> Builds a fixed-width histogram of all grouped numeric values.

Builds a fixed-width histogram of all grouped numeric values.

```tql
histogram(xs:list, bins=uint, width=number, [start=number]) -> record
```

## Description

The `histogram` function builds a finite, fixed-width numeric [histogram](https://en.wikipedia.org/wiki/Histogram) over all values in `xs`. The result is an inspectable model record that you can inspect and query with [`histogram_bucket`](https://tenzir.com/docs/reference/functions/histogram_bucket.md), or compare with [`model_divergence`](https://tenzir.com/docs/reference/functions/model_divergence.md).

The function accepts `int`, `uint`, and `float` values and converts them to `float` before bucketing. Null values increment `null_count`, and NaN and infinities increment `non_finite_count`; neither contributes to `count`, `min`, `max`, or any bucket. Non-null values of other types do not increment `input_count` or any other counter and produce a warning. Durations and timestamps are not supported yet; convert them to numbers first, e.g., `x / 1s`.

### Definition

For `bins = b`, `width = w`, and `start = s`, the represented edges are

$$
e_i = s + iw, \qquad i = 0, \dots, b.
$$

Regular bin $i$ covers $[e_i, e_{i+1})$, except that the final bin also contains $e_b$. Values below $e_0$ enter `underflow`; values above $e_b$ enter `overflow`. For accepted finite inputs $x_1, \dots, x_n$, each regular count is

$$
c_i = \sum_{j=1}^{n} \mathbf{1}[x_j \in B_i].
$$

The model therefore satisfies

$$
\text{count} = \text{underflow} + \sum_{i=0}^{b-1} c_i + \text{overflow}.
$$

The implementation materializes every $e_i$ as a `float` and rejects non-finite or non-increasing edges. Bucket assignment compares against these stored edges rather than recomputing a quotient for each input.

### `xs: list`

The values to bucket.

### `bins = uint`

The number of regular bins. Must be between 1 and 16,384.

### `width = number`

The width of every regular bin. Must be finite and greater than zero.

### `start = number (optional)`

The lower edge of the first regular bin. Values below it count as underflow.

Defaults to `0.0`.

## Result

```tql
{
  model: "histogram",
  version: 1,
  input_count: uint,       // classified numeric, non-finite, and null inputs
  count: uint,             // accepted finite values, incl. under-/overflow
  null_count: uint,        // null inputs
  kind: "fixed_width",
  non_finite_count: uint,  // NaN and infinities
  min: float,              // null when count == 0
  max: float,              // null when count == 0
  start: float,
  width: float,
  underflow: uint,         // values below the first edge
  overflow: uint,          // values above the last edge
  bins: [{lower: float, upper: float, count: uint}, ...],
}
```

The result always contains exactly `bins` regular bin records in ascending order, including bins whose count is zero, and satisfies the identity `sum(bin.count) + underflow + overflow == count`.

Bin `i` covers the half-open interval `[start + i * width, start + (i + 1) * width)`. The final regular bin also includes its upper edge; only values greater than it count as overflow.

The histogram keeps exact integer counters and performs no sampling or sketching. Aggregation state and result size are proportional to `bins`.

## Examples

### Build a histogram over grouped values

```tql
from {x: -2}, {x: 1}, {x: 3}, {x: 7}, {x: 100}
summarize model=histogram(x, bins=4, width=2.5)
```

```tql
{
  model: {
    model: "histogram",
    version: 1,
    input_count: 5,
    count: 5,
    null_count: 0,
    kind: "fixed_width",
    non_finite_count: 0,
    min: -2.0,
    max: 100.0,
    start: 0.0,
    width: 2.5,
    underflow: 1,
    overflow: 1,
    bins: [
      {lower: 0.0, upper: 2.5, count: 1},
      {lower: 2.5, upper: 5.0, count: 1},
      {lower: 5.0, upper: 7.5, count: 1},
      {lower: 7.5, upper: 10.0, count: 0},
    ],
  },
}
```

### Score events against a per-group model

Attach the model back to the original events and compute each value’s relative frequency:

```tql
from {user: "alice", bytes: 100.0},
  {user: "alice", bytes: 120.0},
  {user: "alice", bytes: 9000.0}
summarize user, model=histogram(bytes, bins=10, width=1000.0), options={output: "events"}
score = float(histogram_bucket(model, bytes).count) / model.input_count
select user, bytes, score
```

```tql
{user: "alice", bytes: 100.0, score: 0.6666666666666666}
{user: "alice", bytes: 120.0, score: 0.6666666666666666}
{user: "alice", bytes: 9000.0, score: 0.3333333333333333}
```

## See Also

* [`histogram_bucket`](https://tenzir.com/docs/reference/functions/histogram_bucket.md)
* [`model_divergence`](https://tenzir.com/docs/reference/functions/model_divergence.md)
* [`model_merge`](https://tenzir.com/docs/reference/functions/model_merge.md)
* [`value_counts`](https://tenzir.com/docs/reference/functions/value_counts.md)
* [Aggregate event streams](../../guides/analyze/aggregate-event-streams.md)
