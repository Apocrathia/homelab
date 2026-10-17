---
title: "concatenate"
canonical: https://tenzir.com/docs/reference/functions/concatenate
source: https://tenzir.com/docs/reference/functions/concatenate.md
section: "Docs"
---

# concatenate

> Merges two lists.

Merges two lists.

```tql
concatenate(xs:list, ys:list) -> list
```

## Description

The `concatenate` function returns a list containing all elements from the lists `xs` and `ys` in order. The expression `concatenate(xs, ys)` is equivalent to `[...xs, ...ys]`.

If either argument is `null`, it contributes no elements. For example, `concatenate([1], null)` returns `[1]`, and `concatenate(null, [2])` returns `[2]`.

## Examples

### Concatenate two lists

```tql
from {xs: [1, 2], ys: [3, 4]}
zs = concatenate(xs, ys)
```

```tql
{
  xs: [1, 2],
  ys: [3, 4],
  zs: [1, 2, 3, 4]
}
```

### Concatenate nullable lists

```tql
from {xs: null}
left = concatenate([1], xs)
right = concatenate(xs, [2])
```

```tql
{
  xs: null,
  left: [
    1,
  ],
  right: [
    2,
  ],
}
```

## See Also

* [`append`](https://tenzir.com/docs/reference/functions/append.md)
* [`merge`](https://tenzir.com/docs/reference/functions/merge.md)
* [`prepend`](https://tenzir.com/docs/reference/functions/prepend.md)
* [`zip`](https://tenzir.com/docs/reference/functions/zip.md)
* [Shape lists](../../guides/shape/shape-lists.md)
* [Learn idiomatic TQL](../../tutorials/learn-idiomatic-tql.md)
