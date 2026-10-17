---
title: "append"
canonical: https://tenzir.com/docs/reference/functions/append
source: https://tenzir.com/docs/reference/functions/append.md
section: "Docs"
---

# append

> Inserts an element at the back of a list.

Inserts an element at the back of a list.

```tql
append(xs:list, x:any) -> list
```

## Description

The `append` function returns the list `xs` with `x` inserted at the end. The expression `xs.append(x)` is equivalent to `[...xs, x]`.

If `xs` is `null`, it is treated like an empty list, so `null.append(x)` returns `[x]`.

## Examples

### Append a number to a list

```tql
from {xs: [1, 2]}
xs = xs.append(3)
```

```tql
{xs: [1, 2, 3]}
```

### Append to a nullable list

```tql
from {xs: null}
xs = xs.append(3)
```

```tql
{
  xs: [
    3,
  ],
}
```

## See Also

* [`add`](https://tenzir.com/docs/reference/functions/add.md)
* [`concatenate`](https://tenzir.com/docs/reference/functions/concatenate.md)
* [`prepend`](https://tenzir.com/docs/reference/functions/prepend.md)
* [`remove`](https://tenzir.com/docs/reference/functions/remove.md)
* [Shape lists](../../guides/shape/shape-lists.md)
