---
title: "select_matching"
canonical: https://tenzir.com/docs/reference/functions/select_matching
source: https://tenzir.com/docs/reference/functions/select_matching.md
section: "Docs"
---

# select_matching

> Selects top-level fields from a record when their names match a regular expression.

Selects top-level fields from a record when their names match a regular expression.

```tql
select_matching(x:record, regex:string) -> record
```

## Description

The `select_matching` function returns a record with every top-level field from `x` whose field name matches `regex`.

Matching is partial by default. Use `^` and `$` anchors to match whole field names or prefixes. The function does not recurse into nested records; call it on the nested record if you want to select fields there.

The supported regular expression syntax is [RE2](https://github.com/google/re2/wiki/Syntax).

### `x: record`

The record whose fields you want to filter.

### `regex: string`

The regular expression to match against field names.

## Examples

### Select fields by prefix

```tql
from {
  src_ip: 1.2.3.4,
  src_port: 443,
  dst_ip: 5.6.7.8,
  dst_port: 80,
  proto: "tcp",
}
select endpoints = this.select_matching("^(src|dst)_")
```

```tql
{
  endpoints: {
    src_ip: 1.2.3.4,
    src_port: 443,
    dst_ip: 5.6.7.8,
    dst_port: 80,
  },
}
```

### Select fields by suffix

```tql
from {
  user_id: "u-123",
  session_id: "s-456",
  message: "login",
}
select identifiers = this.select_matching("_id$")
```

```tql
{
  identifiers: {
    user_id: "u-123",
    session_id: "s-456",
  },
}
```

## See Also

* [`select`](https://tenzir.com/docs/reference/operators/select.md)
* [`drop_matching`](https://tenzir.com/docs/reference/functions/drop_matching.md)
* [`match_regex`](https://tenzir.com/docs/reference/functions/match_regex.md)
* [Shape records](../../guides/shape/shape-records.md)
* [Filter and select data](../../guides/optimize/filter-and-select-data.md)
