---
title: "frequency_table_count"
canonical: https://tenzir.com/docs/reference/functions/frequency_table_count
source: https://tenzir.com/docs/reference/functions/frequency_table_count.md
section: "Docs"
---

# frequency_table_count

> Returns the exact count of a value in a frequency-table model.

Returns the exact count of a value in a frequency-table model.

```tql
frequency_table_count(model:record, x:any) -> uint
```

## Description

The `frequency_table_count` function returns the count of `x` in a frequency-table model, or `0` when the value is absent. Value equality is type-sensitive, so a query for `42u` does not match an `int` key whose value is `42`.

The function returns null for a null query. A malformed model produces a warning and returns null.

Choose the denominator explicitly when calculating a frequency:

```tql
accepted_frequency = float(frequency_table_count(model, x)) / model.count
population_frequency = float(frequency_table_count(model, x)) / model.input_count
```

The second form includes null inputs in the denominator.

## Examples

```tql
from {}
model = frequency_table(["login", "logout", "login"])
select count = frequency_table_count(model, "login"),
  frequency = float(frequency_table_count(model, "login")) / model.input_count
```

## See also

* [`frequency_table`](https://tenzir.com/docs/reference/functions/frequency_table.md)
* [`model_divergence`](https://tenzir.com/docs/reference/functions/model_divergence.md)
* [`model_merge`](https://tenzir.com/docs/reference/functions/model_merge.md)
