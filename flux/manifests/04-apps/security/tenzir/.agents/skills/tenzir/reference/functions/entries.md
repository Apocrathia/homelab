---
title: "entries"
canonical: https://tenzir.com/docs/reference/functions/entries
source: https://tenzir.com/docs/reference/functions/entries.md
section: "Docs"
---

# entries

> Converts a record into a list of key/value entries.

Converts a record into a list of key/value entries.

```tql
entries(x:record) -> list<record>
```

Note

This operation is called `to_entries` in jq and `Object.entries` in JavaScript. Unlike `Object.entries`, which returns `[key, value]` pairs, `entries` returns records, like `to_entries` does.

## Description

The `entries` function turns the top-level fields of the record `x` into a list with one entry per field, in field order. Each entry is a record with two fields:

* `key`: the field name as a `string`.
* `value`: the field value, with its original type.

Field names are used literally. A name with a dot, such as `"a.b"`, becomes one key and is not split into a path. Only top-level fields become entries: nested records and lists stay intact as values. Values of different types can appear in the same list, including `null`, lists, and records.

The function is the inverse of [`collect_record`](https://tenzir.com/docs/reference/functions/collect_record.md). Passing the entries of a record to `collect_record` returns the original record, so `x.entries().collect_record()` equals `x`.

To get only the field names or only the values, use [`keys`](https://tenzir.com/docs/reference/functions/keys.md) or [`values`](https://tenzir.com/docs/reference/functions/values.md).

### `x: record`

The record whose fields you want to convert.

### Nulls and invalid inputs

* An empty record produces `[]`.
* A field with a `null` value produces an entry with `value: null`.
* A null input produces `null`.
* A non-record input produces a warning and `null`.

## Examples

### Convert a record into entries

```tql
from {
  user: {
    name: "alice",
    age: 42,
    admin: true,
  },
}
select entries=user.entries()
```

```tql
{
  entries: [
    {
      key: "name",
      value: "alice",
    },
    {
      key: "age",
      value: 42,
    },
    {
      key: "admin",
      value: true,
    },
  ],
}
```

### Keep nested values and nulls

Only the top-level fields become entries. Each value keeps its type, whether it is a list, a record, or `null`:

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
select entries=event.entries()
```

```tql
{
  entries: [
    {
      key: "id",
      value: 7,
    },
    {
      key: "tags",
      value: [
        "a",
        "b",
      ],
    },
    {
      key: "owner",
      value: null,
    },
    {
      key: "source",
      value: {
        ip: 192.0.2.1,
      },
    },
  ],
}
```

### Decode the entries again

Use [`collect_record`](https://tenzir.com/docs/reference/functions/collect_record.md) to turn entries back into a record. The result equals the original record:

```tql
from {
  user: {
    name: "alice",
    age: 42,
    admin: true,
  },
}
select user=user.entries().collect_record()
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

### Filter fields by value

Process the entries with list functions, then decode the remaining ones. For example, use [`where`](https://tenzir.com/docs/reference/functions/where.md) to keep only the fields with a value above a threshold:

```tql
from {
  scores: {
    alice: 42,
    bob: 7,
    carol: 19,
  },
}
select top=scores.entries().where(e => e.value > 10).collect_record()
```

```tql
{
  top: {
    alice: 42,
    carol: 19,
  },
}
```

### Turn the fields of a record into events

Combine `entries` with [`unroll`](https://tenzir.com/docs/reference/operators/unroll.md) to emit one event per field:

```tql
from {
  counters: {
    logins: 12,
    alerts: 3,
  },
}
select entries=counters.entries()
unroll entries
select name=entries.key, count=entries.value
```

```tql
{
  name: "logins",
  count: 12,
}
{
  name: "alerts",
  count: 3,
}
```

## See Also

* [`collect_record`](https://tenzir.com/docs/reference/functions/collect_record.md)
* [`keys`](https://tenzir.com/docs/reference/functions/keys.md)
* [`values`](https://tenzir.com/docs/reference/functions/values.md)
* [`where`](https://tenzir.com/docs/reference/functions/where.md)
* [Shape records](../../guides/shape/shape-records.md)
