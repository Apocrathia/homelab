---
title: "map_keys"
canonical: https://tenzir.com/docs/reference/functions/map_keys
source: https://tenzir.com/docs/reference/functions/map_keys.md
section: "Docs"
---

# map_keys

> Renames the top-level fields of a record by applying a lambda to each field name.

Renames the top-level fields of a record by applying a lambda to each field name.

```tql
map_keys(x:record, function:string -> string) -> record
```

## Description

The `map_keys` function returns a record with the same field values as `x`, but with field names produced by `function`.

The function applies only to top-level fields. To rename fields in a nested record, call `map_keys` on that nested record.

The lambda receives each field name as a string. If the lambda returns `null` or a non-string value for a field, `map_keys` emits a warning and keeps that field’s original name. If the mapped field names conflict, `map_keys` emits a warning and leaves the record unchanged.

### `x: record`

The record whose field names you want to rename.

### `function: string -> string`

A unary lambda that maps each field name to a new field name.

## Examples

### Lowercase record field names

```tql
from {
  request: {
    "Cache-Control": "no-cache, no-store",
    Pragma: "no-cache",
    Host: "domain.gent",
  },
}
request = request.map_keys(key => key.to_lower())
```

```tql
{
  request: {
    "cache-control": "no-cache, no-store",
    pragma: "no-cache",
    host: "domain.gent",
  },
}
```

## See Also

* [`drop_matching`](https://tenzir.com/docs/reference/functions/drop_matching.md)
* [`keys`](https://tenzir.com/docs/reference/functions/keys.md)
* [`select_matching`](https://tenzir.com/docs/reference/functions/select_matching.md)
* [Shape records](../../guides/shape/shape-records.md)
