---
title: "add"
canonical: https://tenzir.com/docs/reference/functions/add
source: https://tenzir.com/docs/reference/functions/add.md
section: "Docs"
---

# add

> Adds an element into a list if it doesn’t already exist (set-insertion).

Adds an element into a list if it doesn’t already exist (set-insertion).

```tql
add(xs:list, x:any) -> list
```

## Description

The `add` function returns the list `xs` with `x` added at the end, but only if `x` is not already present in the list. This performs a set-insertion operation, ensuring no duplicate values in the resulting list.

### `xs: list`

The list to add to.

### `x: any`

An element to add to the list. The element can have any type, and the list can hold elements of different types. Two elements count as duplicates only when they have the same type and value, so `1` and `"1"` are distinct.

## Examples

### Add a new element to a list

```tql
from {xs: [1, 2, 3]}
xs = xs.add(4)
```

```tql
{xs: [1, 2, 3, 4]}
```

### Try to add an existing element

```tql
from {xs: [1, 2, 3]}
xs = xs.add(2)
```

```tql
{xs: [1, 2, 3]}
```

### Add to an empty list

```tql
from {xs: []}
xs = xs.add("hello")
```

```tql
{xs: ["hello"]}
```

## See Also

* [`append`](https://tenzir.com/docs/reference/functions/append.md)
* [`distinct`](https://tenzir.com/docs/reference/functions/distinct.md)
* [`prepend`](https://tenzir.com/docs/reference/functions/prepend.md)
* [`remove`](https://tenzir.com/docs/reference/functions/remove.md)
* [Enrich events with AI](../../guides/enrich/enrich-events-with-ai.md)
* [Shape lists](../../guides/shape/shape-lists.md)
