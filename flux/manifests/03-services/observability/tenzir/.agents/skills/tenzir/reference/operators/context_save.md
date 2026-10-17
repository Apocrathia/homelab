---
title: "context_save"
canonical: https://tenzir.com/docs/reference/operators/context_save
source: https://tenzir.com/docs/reference/operators/context_save.md
section: "Docs"
---

# context_save

> Saves context state.

Saves context state.

```tql
context_save name:string
```

## Description

The `context_save` operator dumps the state of the specified context into its (binary) output.

### `name: string`

The name of the context whose state to save.

## Examples

### Store the database of a GeoIP context

```tql
context_save "ctx"
to_file "snapshot.mmdb"
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
* [`context_reset`](https://tenzir.com/docs/reference/operators/context_reset.md)
* [`context_update`](https://tenzir.com/docs/reference/operators/context_update.md)
* [Use lookup tables](../../guides/enrich/use-lookup-tables.md)
