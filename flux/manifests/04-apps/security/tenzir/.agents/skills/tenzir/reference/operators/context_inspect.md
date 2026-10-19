---
title: "context_inspect"
canonical: https://tenzir.com/docs/reference/operators/context_inspect
source: https://tenzir.com/docs/reference/operators/context_inspect.md
section: "Docs"
---

# context_inspect

> Resets a context.

Resets a context.

```tql
context_inspect name:string
```

## Description

The `context_inspect` operator shows details about a specified context.

### `name: string`

The name of the context to inspect.

## Examples

### Inspect a context

Add data to the lookup table:

```tql
from {x:1, y:"a"},
     {x:2, y:"b"}
context_update "ctx", key=x, value=y
```

Retrieve the lookup table contents:

```tql
context_inspect "ctx"
```

```tql
{key: 2, value: "b"}
{key: 1, value: "a"}
```

## See Also

* [`context_create_bloom_filter`](https://tenzir.com/docs/reference/operators/context_create_bloom_filter.md)
* [`context_create_geoip`](https://tenzir.com/docs/reference/operators/context_create_geoip.md)
* [`context_create_lookup_table`](https://tenzir.com/docs/reference/operators/context_create_lookup_table.md)
* [`context_enrich`](https://tenzir.com/docs/reference/operators/context_enrich.md)
* [`context_erase`](https://tenzir.com/docs/reference/operators/context_erase.md)
* [`context_list`](https://tenzir.com/docs/reference/operators/context_list.md)
* [`context_load`](https://tenzir.com/docs/reference/operators/context_load.md)
* [`context_remove`](https://tenzir.com/docs/reference/operators/context_remove.md)
* [`context_reset`](https://tenzir.com/docs/reference/operators/context_reset.md)
* [`context_save`](https://tenzir.com/docs/reference/operators/context_save.md)
* [`context_update`](https://tenzir.com/docs/reference/operators/context_update.md)
* [Use lookup tables](../../guides/enrich/use-lookup-tables.md)
