---
title: "context_reset"
canonical: https://tenzir.com/docs/reference/operators/context_reset
source: https://tenzir.com/docs/reference/operators/context_reset.md
section: "Docs"
---

# context_reset

> Resets a context.

Resets a context.

```tql
context_reset name:string
```

## Description

The `context_reset` operator erases all data that has been added with `context_update`.

### `name: string`

The name of the context to reset.

## Examples

### Reset a context

```tql
context_reset "ctx"
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
* [`context_remove`](https://tenzir.com/docs/reference/operators/context_remove.md)
* [`context_save`](https://tenzir.com/docs/reference/operators/context_save.md)
* [`context_update`](https://tenzir.com/docs/reference/operators/context_update.md)
