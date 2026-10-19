---
title: "values"
canonical: https://tenzir.com/docs/reference/functions/values
source: https://tenzir.com/docs/reference/functions/values.md
section: "Docs"
---

# values

> Retrieves a list of field values from a record.

Retrieves a list of field values from a record.

```tql
values(x:record) -> list
```

Note

This operation is called `Object.values` in JavaScript, `dict.values` in Python, and `[.[]]` in jq.

## Description

The `values` function returns a list with the value of every top-level field of the record `x`, in field order. It complements [`keys`](https://tenzir.com/docs/reference/functions/keys.md), which returns the field names in the same order.

Each value keeps its original type, and one list can hold values of different types, including `null`, lists, and records. Only top-level fields contribute values: nested records and lists stay intact and are not flattened.

Use [`entries`](https://tenzir.com/docs/reference/functions/entries.md) instead when you need the field names together with their values, and use [`collect_record`](https://tenzir.com/docs/reference/functions/collect_record.md) to turn keys and values back into a record.

### `x: record`

The record whose field values you want to retrieve.

### Nulls and invalid inputs

* An empty record produces `[]`.
* A field with a `null` value contributes a `null` element.
* A null input produces `null`.
* A non-record input produces a warning and `null`.

## Examples

### Get all field values from a record

```tql
from {
  user: {
    name: "alice",
    age: 42,
    admin: true,
  },
}
select values=user.values()
```

```tql
{
  values: ["alice", 42, true],
}
```

### Keep nested values and nulls

Values keep their type, whether they are lists, records, or `null`:

```tql
from {
  event: {
    id: 7,
    tags: ["a", "b"],
    owner: null,
    source: {
      ip: 192.0.2.1,
    },
  },
}
select values=event.values()
```

```tql
{
  values: [
    7,
    ["a", "b"],
    null,
    {
      ip: 192.0.2.1,
    },
  ],
}
```

### Aggregate the values of a record

Because `values` returns a list, you can use list functions to aggregate fields without naming them:

```tql
from {
  counters: {
    logins: 12,
    alerts: 3,
    errors: 1,
  },
}
select total=counters.values().sum(), largest=counters.values().max()
```

```tql
{
  total: 16,
  largest: 12,
}
```

### Check whether a record contains a value

```tql
from {
  levels: {
    web: "low",
    db: "high",
    cache: "low",
  },
}
select has_high="high" in levels.values(),
  has_critical="critical" in levels.values()
```

```tql
{
  has_high: true,
  has_critical: false,
}
```

### Decode keys and values again

[`keys`](https://tenzir.com/docs/reference/functions/keys.md) and `values` list the fields in the same order. Pass both to [`collect_record`](https://tenzir.com/docs/reference/functions/collect_record.md) to rebuild the original record:

```tql
from {
  user: {
    name: "alice",
    age: 42,
    admin: true,
  },
}
select user=collect_record(user.keys(), user.values())
```

```tql
{
  user: {
    name: "alice",
    age: 42,
    admin: true,
  },
}
```

## See Also

* [`collect_record`](https://tenzir.com/docs/reference/functions/collect_record.md)
* [`entries`](https://tenzir.com/docs/reference/functions/entries.md)
* [`keys`](https://tenzir.com/docs/reference/functions/keys.md)
* [Shape records](../../guides/shape/shape-records.md)
