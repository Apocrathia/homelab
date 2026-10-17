---
title: "keys"
canonical: https://tenzir.com/docs/reference/functions/keys
source: https://tenzir.com/docs/reference/functions/keys.md
section: "Docs"
---

# keys

> Retrieves a list of field names from a record.

Retrieves a list of field names from a record.

```tql
keys(x:record) -> list<string>
```

## Description

The `keys` function returns a list of strings containing all field names from the input record `x`.

To get the values, use [`values`](https://tenzir.com/docs/reference/functions/values.md). To get both together, use [`entries`](https://tenzir.com/docs/reference/functions/entries.md).

### `x: record`

The record whose field names you want to retrieve.

## Examples

### Get all field names from a record

```tql
from {x: 1, y: "hello", z: true}
select field_names = this.keys()
```

```tql
{
  field_names: ["x", "y", "z"],
}
```

### Use keys to dynamically access record fields

You can combine `keys` with sorting and element access to dynamically select fields from records. For example, the following collects the values from the element with the first key alphabetically in each record:

```tql
from (
  {foo: 10, bar: 20, baz: 30},
  {foo: 100, bar: 200},
  {baz: 300, qux: 400},
  {},
)
summarize first_sorted_key = this[this.keys().sort().first()]?.collect()
```

```tql
{
  first_sorted_key: [20, 200, 300],
}
```

### Use keys to get distribution of available fields

```tql
from (
  {foo: 10, bar: 20, baz: 30},
  {foo: 100, bar: 200},
  {baz: 300, qux: 400},
  {},
)
select key = this.keys()
unroll key
top key
```

```tql
{key: "foo", count: 2}
{key: "bar", count: 2}
{key: "baz", count: 2}
{key: "qux", count: 1}
```

## See Also

* [`entries`](https://tenzir.com/docs/reference/functions/entries.md)
* [`has`](https://tenzir.com/docs/reference/functions/has.md)
* [`get`](https://tenzir.com/docs/reference/functions/get.md)
* [`values`](https://tenzir.com/docs/reference/functions/values.md)
* [Shape records](../../guides/shape/shape-records.md)
