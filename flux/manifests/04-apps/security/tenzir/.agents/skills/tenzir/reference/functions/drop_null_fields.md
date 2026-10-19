---
title: "drop_null_fields"
canonical: https://tenzir.com/docs/reference/functions/drop_null_fields
source: https://tenzir.com/docs/reference/functions/drop_null_fields.md
section: "Docs"
---

# drop_null_fields

> Returns a record with fields whose value is null removed.

Returns a record with fields whose value is `null` removed.

```tql
drop_null_fields(x:record, field:field...) -> record
```

## Description

The `drop_null_fields` function returns a copy of `x` with every field whose value is `null` removed. Without explicit selectors, every field is considered, including fields nested inside record-typed values. With selectors, only the named fields (and any fields nested within them) are considered for removal; other null fields are preserved.

Unlike `print_ndjson(strip_null_fields=true)`, the function never serializes the record, so `secret`-typed values flow through unchanged and reach the sink unredacted.

Operator equivalent

The function mirrors the [`drop_null_fields`](https://tenzir.com/docs/reference/operators/drop_null_fields.md) operator, but operates on a record expression rather than the top-level event. Use the function when you need to clean fields inline - for example as the `body=` argument to [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md).

### `x: record`

The record from which to remove null fields.

### `field: field... (optional)`

A comma-separated list of field paths inside `x` to consider. When omitted, every field is considered.

## Examples

### Drop all null fields

```tql
from {
  id: 42,
  status: "active",
  comment: null,
}
this = drop_null_fields(this)
```

```tql
{
  id: 42,
  status: "active",
}
```

### Build an HTTP request body inline

A common use case is cleaning optional `null` fields out of an inline body record before sending it to an API that rejects JSON `null` values:

```tql
from_http "https://api.example.com/v1/lookup",
  method="POST",
  body=drop_null_fields({
    version: 1,
    query: "example",
    options: null,
  })
```

The wire body contains only `version` and `query`; `options` is omitted.

### Restrict the drop to specific fields

```tql
from {
  a: null,
  b: null,
  c: null,
  d: 1,
}
this = drop_null_fields(this, a, c)
```

```tql
{
  b: null,
  d: 1,
}
```

`b` stays in the result because it was not named in the selector list, even though it is `null`.

### Recursive drop inside nested records

```tql
from {
  metadata: {
    created: "2024-01-01",
    updated: null,
  },
  data: {
    value: 42,
    comment: null,
  },
}
this = drop_null_fields(this)
```

```tql
{
  metadata: {
    created: "2024-01-01",
  },
  data: {
    value: 42,
  },
}
```

## See Also

* [`drop_null_fields`](https://tenzir.com/docs/reference/operators/drop_null_fields.md)
* [`drop_matching`](https://tenzir.com/docs/reference/functions/drop_matching.md)
* [`select_matching`](https://tenzir.com/docs/reference/functions/select_matching.md)
* [`has`](https://tenzir.com/docs/reference/functions/has.md)
