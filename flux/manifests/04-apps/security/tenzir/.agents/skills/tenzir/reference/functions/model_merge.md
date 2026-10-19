---
title: "model_merge"
canonical: https://tenzir.com/docs/reference/functions/model_merge
source: https://tenzir.com/docs/reference/functions/model_merge.md
section: "Docs"
---

# model_merge

> Merges compatible statistical model records.

Merges compatible statistical model records.

```tql
model_merge(models:list<record>) -> record
```

## Description

The `model_merge` function works as an aggregation over model records and as a regular function over a list. It ignores null inputs. An empty input returns null.

Every non-null model must have the same `model` and `version`. Model-specific configuration must also be compatible:

* Histograms require identical represented edges.
* Frequency tables merge matching exact values.
* T-digests require equal compression.
* HyperLogLog models require equal precision and hash contracts.

A malformed or incompatible input produces a warning and returns null. The function never returns a partial merge.

### Definition

For compatible models $M^{(1)}, \dots, M^{(r)}$, common envelope counters add:

$$
\text{count}(M) = \sum_{k=1}^{r}\text{count}(M^{(k)}),
$$

and likewise for `input_count`, `null_count`, and any model-specific classified counters. Model state combines as follows:

* Histogram bin and tail counts add component-wise; `min` and `max` become the extrema over non-empty inputs.
* Frequency-table counts use
  $c(v)=\sum_k c_k(v)$
  over the union of exact values. Non-empty inputs must have the same `value_type`.
* HyperLogLog registers use
  $M_j=\max_k M_j^{(k)}$
  .
* T-digest centroids enter one stream ordered by mean and run through the same compression rule as construction.

All integer additions use checked arithmetic. The function computes a complete candidate state before replacing the accumulator, so an overflow or incompatibility cannot expose a partial merge.

## Examples

### Merge partial histograms

```tql
from {}
a = histogram([1.0, 2.0], bins=2, width=5.0)
b = histogram([6.0, 7.0], bins=2, width=5.0)
select merged = model_merge([a, b])
```

## See also

* [`histogram`](https://tenzir.com/docs/reference/functions/histogram.md)
* [`frequency_table`](https://tenzir.com/docs/reference/functions/frequency_table.md)
* [`tdigest`](https://tenzir.com/docs/reference/functions/tdigest.md)
* [`hll`](https://tenzir.com/docs/reference/functions/hll.md)
