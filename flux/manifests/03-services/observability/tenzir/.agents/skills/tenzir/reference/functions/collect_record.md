---
title: "collect_record"
canonical: https://tenzir.com/docs/reference/functions/collect_record
source: https://tenzir.com/docs/reference/functions/collect_record.md
section: "Docs"
---

# collect_record

> Collects key/value entries or record fragments into a record.

Collects key/value entries or record fragments into a record.

```tql
collect_record(entries:list) -> record
collect_record(keys:list, values:list) -> record
```

Note

This operation is called `from_entries` in other languages and tools, such as jq, or `Object.fromEntries` in JavaScript.

## Description

The `collect_record` function builds a record from any mixture of these entries:

* A record with exactly the fields `key` and `value`, in either order. The value of `key` becomes the output field name.
* A two-element list containing a key and its value.
* Any other record, whose fields are merged into the output record.

With two arguments, the function pairs each key in the first list with the value at the same position in the second list. Both lists must have the same length.

Keys are automatically converted to strings using the same representation as [`string`](https://tenzir.com/docs/reference/functions/string.md). For example, `42`, `true`, and `null` become `"42"`, `"true"`, and `"null"`. Strings remain unchanged. Field names are interpreted literally: a key such as `"a.b"` creates one field, not a nested record. Empty strings are valid keys. Values can have any type, including lists, records, and `null`.

If keys produce the same string, the last value wins, even when that value is `null`. For example, `42` and `"42"` refer to the same field. Fields retain the order of their first occurrence. Records are merged shallowly: a later nested record replaces the earlier value rather than merging its fields recursively.

### Nulls and invalid inputs

* An empty list, or a list containing only null entries or empty records, produces `{}`.
* Null entries are skipped without a warning. A null key becomes the field name `"null"`.
* Null values are preserved as fields.
* A null input list produces `null`. With two arguments, either null list produces `null`.
* A non-list input or two lists of different lengths produce a warning and `null`.
* Entry lists with a length other than two and entries that are neither records nor lists produce a warning and are skipped. Other entries still contribute to the result.

### Aggregation inputs

As an aggregation, the one-argument form consumes one entry or record fragment per event. The two-argument form consumes a key expression and a value expression per event. Input lists are not implicitly flattened: a list supplied by one event represents one two-element entry.

The result starts as `{}`. The same entry precedence, null handling, and last-value-wins rules apply across events. Duplicate keys therefore make the result depend on input order.

## Examples

### Decode explicit entries

```tql
from {
  entries: [
    {
      key: "alice",
      value: 42,
    },
    {
      value: 7,
      key: "bob",
    },
  ],
}
select result=collect_record(entries)
```

```tql
{
  result: {
    alice: 42,
    bob: 7,
  },
}
```

### Decode pairs with different value types

```tql
from {
  pairs: [
    ["count", 42],
    ["active", true],
    ["tags", ["security", "network"]],
  ],
}
select result=pairs.collect_record()
```

```tql
{
  result: {
    count: 42,
    active: true,
    tags: ["security", "network"],
  },
}
```

### Convert keys to strings

Keys that convert to the same string share one field. The last value wins:

```tql
from {
  pairs: [
    [42, "first"],
    [true, 1],
    [null, 2],
    ["42", "last"],
  ],
}
select result=collect_record(pairs)
```

```tql
{
  result: {
    "42": "last",
    "true": 1,
    "null": 2,
  },
}
```

### Combine separate key and value lists

```tql
from {
  names: ["alice", "bob"],
  scores: [42, 7],
}
select result=collect_record(names, scores)
```

```tql
{
  result: {
    alice: 42,
    bob: 7,
  },
}
```

### Merge fragments and entries

```tql
from {
  entries: [
    {
      a: 1,
      b: 2,
    },
    ["a", 3],
    {
      key: "c",
      value: null,
    },
  ],
}
select result=collect_record(entries)
```

```tql
{
  result: {
    a: 3,
    b: 2,
    c: null,
  },
}
```

### Keep literal key and value fields

A record with exactly `key` and `value` is always decoded as an entry. To create literal fields with these names, use pairs instead:

```tql
from {
  entries: [
    ["key", "a"],
    ["value", 1],
  ],
}
select result=collect_record(entries)
```

```tql
{
  result: {
    key: "a",
    value: 1,
  },
}
```

## See Also

* [`collect`](https://tenzir.com/docs/reference/functions/collect.md)
* [`entries`](https://tenzir.com/docs/reference/functions/entries.md)
* [`merge`](https://tenzir.com/docs/reference/functions/merge.md)
* [`string`](https://tenzir.com/docs/reference/functions/string.md)
* [`values`](https://tenzir.com/docs/reference/functions/values.md)
* [`zip`](https://tenzir.com/docs/reference/functions/zip.md)
* [Shape records](../../guides/shape/shape-records.md)
* [Shape lists](../../guides/shape/shape-lists.md)
* [Reshape complex data](../../guides/shape/reshape-complex-data.md)
