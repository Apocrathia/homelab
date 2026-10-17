---
title: "merge"
canonical: https://tenzir.com/docs/reference/functions/merge
source: https://tenzir.com/docs/reference/functions/merge.md
section: "Docs"
---

# merge

> Combines two records into a single record by merging their fields.

Combines two records into a single record by merging their fields.

```tql
merge(x: record, y: record) -> record
```

## Description

The `merge` function takes two records and returns a new record containing all fields from both records. If both records contain the same field, the value from the second record takes precedence.

The expression `merge(x, y)` has the same field precedence and null handling as `{...x, ...y}`.

## Examples

### Basic record merging

```tql
from {x: {a: 1, b: 2}, y: {c: 3, d: 4}}
select result = merge(x, y)
```

```tql
{
  result: {
    a: 1,
    b: 2,
    c: 3,
    d: 4
  }
}
```

### Handling overlapping fields

When fields exist in both records, the second record’s values take precedence:

```tql
from {
  r1: {name: "Alice", age: 30},
  r2: {name: "Bob", location: "NY"},
}
select result = merge(r1, r2)
```

```tql
{
  result: {
    name: "Bob",
    age: 30,
    location: "NY"
  }
}
```

### Handling null values

If either input is null, the input will be ignored.

```tql
from {x: {a: 1}, y: null}
select result = merge(x, y)
```

```tql
{
  result: {
    a: 1
  }
}
```

## See Also

* [`collect_record`](https://tenzir.com/docs/reference/functions/collect_record.md)
* [`concatenate`](https://tenzir.com/docs/reference/functions/concatenate.md)
* [Reshape complex data](../../guides/shape/reshape-complex-data.md)
* [Shape records](../../guides/shape/shape-records.md)
* [Learn idiomatic TQL](../../tutorials/learn-idiomatic-tql.md)
