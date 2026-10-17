---
title: "context_remove"
canonical: https://tenzir.com/docs/reference/operators/context_remove
source: https://tenzir.com/docs/reference/operators/context_remove.md
section: "Docs"
---

# context_remove

> Deletes a context.

Deletes a context.

```tql
context_remove name:string
```

## Description

The `context_remove` operator deletes the specified context.

### `name: string`

The name of the context to delete.

## Examples

### Delete a context

```tql
context_remove "ctx"
```

## See Also

* [`context_create_bloom_filter`](https://tenzir.com/docs/reference/operators/context_create_bloom_filter.md)
* [`context_create_geoip`](https://tenzir.com/docs/reference/operators/context_create_geoip.md)
* [`context_create_lookup_table`](https://tenzir.com/docs/reference/operators/context_create_lookup_table.md)
* [`context_enrich`](https://tenzir.com/docs/reference/operators/context_enrich.md)
* [`context_erase`](https://tenzir.com/docs/reference/operators/context_erase.md)
* [`context_inspect`](https://tenzir.com/docs/reference/operators/context_inspect.md)
* [`context_list`](https://tenzir.com/docs/reference/operators/context_list.md)
* [`context_load`](https://tenzir.com/docs/reference/operators/context_load.md)
* [`context_reset`](https://tenzir.com/docs/reference/operators/context_reset.md)
* [`context_save`](https://tenzir.com/docs/reference/operators/context_save.md)
* [`context_update`](https://tenzir.com/docs/reference/operators/context_update.md)
* [Use lookup tables](../../guides/enrich/use-lookup-tables.md)
