---
title: "contains_null"
canonical: https://tenzir.com/docs/reference/functions/contains_null
source: https://tenzir.com/docs/reference/functions/contains_null.md
section: "Docs"
---

# contains_null

> Checks whether the input contains any null values.

Checks whether the input contains any `null` values.

```tql
contains_null(x:any) -> bool
```

## Description

The `contains_null` function checks if the input contains any `null` values recursively.

### `x: any`

The input to check for `null` values.

## Examples

### Check if list has null values

```tql
from {x: [{a: 1}, {a: null}]}
contains_null = x.contains_null()
```

```tql
{
  x: [
    {
      a: 1,
    },
    {
      a: null,
    },
  ],
  contains_null: true,
}
```

### Check a record with null values

```tql
from {x: "foo", y: null}
contains_null = this.contains_null()
```

```tql
{
  x: "foo",
  y: null,
  contains_null: true,
}
```

## See Also

* [`search`](https://tenzir.com/docs/reference/functions/search.md)
* [`has`](https://tenzir.com/docs/reference/functions/has.md)
* [`is_empty`](https://tenzir.com/docs/reference/functions/is_empty.md)
