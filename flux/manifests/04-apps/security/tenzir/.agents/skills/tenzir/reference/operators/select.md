---
title: "select"
canonical: https://tenzir.com/docs/reference/operators/select
source: https://tenzir.com/docs/reference/operators/select.md
section: "Docs"
---

# select

> Selects some values and discards the rest.

Selects some values and discards the rest.

```tql
select (field|assignment)...
```

## Description

This operator keeps only the provided fields and drops the rest.

### `field`

The field to keep. If it does not exist, it’s given the value `null` and a warning is emitted.

### `assignment`

An assignment of the form `<field>=<expr>`. Use brackets to compute a path segment at runtime, as in `result[key] = value`. The index expression must return a string. Otherwise, Tenzir emits a warning and skips the assignment for that event.

## Examples

### Select and create columns

Keep `a` and introduce `y` with the value of `b`:

```tql
from {a: 1, b: 2, c: 3}
select a, y=b
```

```tql
{a: 1, y: 2}
```

A more complex example with expressions and selection through records:

```tql
from {
  name: "foo",
  pos: {
    x: 1,
    y: 2,
  },
  state: "active",
}
select id=name.to_upper(), pos.x, added=true
```

```tql
{
  id: "FOO",
  pos: {
    x: 1,
  },
  added: true,
}
```

### Compute a selected field name

```tql
from {key: "latency", value: 42, ignored: true}
select metrics[key] = value
```

```tql
{
  metrics: {
    latency: 42,
  },
}
```

## See Also

* [`drop`](https://tenzir.com/docs/reference/operators/drop.md)
* [`where`](https://tenzir.com/docs/reference/operators/where.md)
* [Filter and select data](../../guides/optimize/filter-and-select-data.md)
* [Learn idiomatic TQL](../../tutorials/learn-idiomatic-tql.md)
