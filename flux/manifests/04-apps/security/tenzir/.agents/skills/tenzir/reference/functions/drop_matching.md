---
title: "drop_matching"
canonical: https://tenzir.com/docs/reference/functions/drop_matching
source: https://tenzir.com/docs/reference/functions/drop_matching.md
section: "Docs"
---

# drop_matching

> Removes top-level fields from a record when their names match a regular expression.

Removes top-level fields from a record when their names match a regular expression.

```tql
drop_matching(x:record, regex:string) -> record
```

## Description

The `drop_matching` function returns a record with every top-level field from `x` whose field name does not match `regex`.

Matching is partial by default. Use `^` and `$` anchors to match whole field names or prefixes. The function does not recurse into nested records; call it on the nested record if you want to drop fields there.

The supported regular expression syntax is [RE2](https://github.com/google/re2/wiki/Syntax).

### `x: record`

The record whose fields you want to filter.

### `regex: string`

The regular expression to match against field names.

## Examples

### Remove fields by name

```tql
from {
  name: "Alice",
  email: "alice@example.com",
  password: "secret",
  api_key: "xyz123",
}
select public = this.drop_matching("^(password|api_key)$")
```

```tql
{
  public: {
    name: "Alice",
    email: "alice@example.com",
  },
}
```

### Separate matching fields from the rest

```tql
from {
  foo: 1,
  bar: 2,
  baz: 3,
}
let $pattern = "^ba"
select moved = this.select_matching($pattern),
       rest = this.drop_matching($pattern)
```

```tql
{
  moved: {
    bar: 2,
    baz: 3,
  },
  rest: {
    foo: 1,
  },
}
```

## See Also

* [`drop`](https://tenzir.com/docs/reference/operators/drop.md)
* [`select_matching`](https://tenzir.com/docs/reference/functions/select_matching.md)
* [`match_regex`](https://tenzir.com/docs/reference/functions/match_regex.md)
* [Shape records](../../guides/shape/shape-records.md)
* [Filter and select data](../../guides/optimize/filter-and-select-data.md)
