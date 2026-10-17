---
title: "unroll"
canonical: https://tenzir.com/docs/reference/operators/unroll
source: https://tenzir.com/docs/reference/operators/unroll.md
section: "Docs"
---

# unroll

> Returns a new event for each member of a list or a record in an event, duplicating the surrounding event.

Returns a new event for each member of a list or a record in an event, duplicating the surrounding event.

```tql
unroll [field:list|record]
```

## Description

The `unroll` returns an event for each member of a specified list or record field, leaving the surrounding event unchanged.

Drops events where the specified field is an empty record, an empty list, or null.

### `field: list|record`

Sets the name of the list or record field.

## Examples

### Unroll a list

```tql
from {x: "a", y: [1, 2, 3]},
     {x: "b", y: []},
     {x: "c", y: [4]}
unroll y
```

```tql
{x: "a", y: 1}
{x: "a", y: 2}
{x: "a", y: 3}
{x: "c", y: 4}
```

### Unroll a record

```tql
from {x: "a", y: {foo: 1, baz: 2}},
     {x: "b", y: {foo: null, baz: 3}},
     {x: "c", y: null}
unroll y
```

```tql
{x: "a", y: {foo: 1}}
{x: "a", y: {baz: 2}}
{x: "b", y: {foo: null}}
{x: "b", y: {baz: 3}}
```

## See Also

* [`flatten`](https://tenzir.com/docs/reference/functions/flatten.md)
* [Enrich with threat intel](../../guides/enrich/enrich-with-threat-intel.md)
* [Use lookup tables](../../guides/enrich/use-lookup-tables.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
