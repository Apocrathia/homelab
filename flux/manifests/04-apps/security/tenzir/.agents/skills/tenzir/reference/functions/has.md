---
title: "has"
canonical: https://tenzir.com/docs/reference/functions/has
source: https://tenzir.com/docs/reference/functions/has.md
section: "Docs"
---

# has

> Checks whether a record has a specified field.

Checks whether a record has a specified field.

```tql
has(x:record, field:string) -> bool
```

## Description

The `has` function returns `true` if the record contains the specified field and `false` otherwise.

## Examples

### Check if a record has a specific field

```tql
from {
  x: "foo",
  y: null,
}
this = {
  has_x: this.has("x"),
  has_y: this.has("y"),
  has_z: this.has("z"),
}
```

```tql
{
  has_x: true,
  has_y: true,
  has_z: false,
}
```

## See Also

* [`is_empty`](https://tenzir.com/docs/reference/functions/is_empty.md)
* [`keys`](https://tenzir.com/docs/reference/functions/keys.md)
* [Shape records](../../guides/shape/shape-records.md)
