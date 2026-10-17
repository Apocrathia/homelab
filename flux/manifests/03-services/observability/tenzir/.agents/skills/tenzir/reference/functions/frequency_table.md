---
title: "frequency_table"
canonical: https://tenzir.com/docs/reference/functions/frequency_table
source: https://tenzir.com/docs/reference/functions/frequency_table.md
section: "Docs"
---

# frequency_table

> Builds an exact, mergeable table of categorical value counts.

Builds an exact, mergeable table of categorical value counts.

```tql
frequency_table(xs:list) -> record
```

## Description

The `frequency_table` function builds a [frequency table](https://en.wikipedia.org/wiki/Frequency_distribution) by counting every distinct non-null value in `xs`. Unlike [`value_counts`](https://tenzir.com/docs/reference/functions/value_counts.md), it returns a versioned model record that you can persist, merge with [`model_merge`](https://tenzir.com/docs/reference/functions/model_merge.md), query with [`frequency_table_count`](https://tenzir.com/docs/reference/functions/frequency_table_count.md), and compare with [`model_divergence`](https://tenzir.com/docs/reference/functions/model_divergence.md).

The `values` list sorts entries by descending count. Equal counts use the engine’s strict weak value order.

Values must not contain NaN or positive or negative infinity, including in nested lists and records. The function warns and returns null when it encounters a non-finite value.

All non-null inputs must have the same TQL type. If inputs of different types occur, the function produces a warning and returns null rather than coercing exact keys. The model records the accepted type in `value_type`.

### Definition

For non-null inputs $x_1, \dots, x_n$ and their exact support $V$, the count of each value $v \in V$ is

$$
c(v) = \sum_{j=1}^{n} \mathbf{1}[x_j = v].
$$

The model stores every pair $(v, c(v))$ and satisfies

```plaintext
\text{count} = \sum_{v \in V} c(v), \qquad
\text{input_count} = \text{count} + \text{null_count}.
```

Equality is type-sensitive. A query for `42u` does not match an `int` key whose value is `42`. A single table cannot contain `42`, `42u`, and `42.0` together because their types differ. Merging adds $c(v)$ for equal keys. Non-empty tables must have the same `value_type` to merge; an empty table has `value_type: "null"` and is compatible with every value type.

## Result

```tql
{
  model: "frequency_table",
  version: 1,
  input_count: uint,
  count: uint,
  null_count: uint,
  value_type: string,
  values: [{value: any, count: uint}, ...],
}
```

The model uses memory proportional to the number of distinct values.

## Examples

### Count categorical values

```tql
from {action: "login"}, {action: "logout"}, {action: "login"}
summarize model = frequency_table(action)
select model, login_count = frequency_table_count(model, "login")
```

```tql
{
  model: {
    model: "frequency_table",
    version: 1,
    input_count: 3,
    count: 3,
    null_count: 0,
    value_type: "string",
    values: [
      {value: "login", count: 2},
      {value: "logout", count: 1},
    ],
  },
  login_count: 2,
}
```

## See also

* [`frequency_table_count`](https://tenzir.com/docs/reference/functions/frequency_table_count.md)
* [`model_divergence`](https://tenzir.com/docs/reference/functions/model_divergence.md)
* [`model_merge`](https://tenzir.com/docs/reference/functions/model_merge.md)
* [`value_counts`](https://tenzir.com/docs/reference/functions/value_counts.md)
