---
title: "context_load"
canonical: https://tenzir.com/docs/reference/operators/context_load
source: https://tenzir.com/docs/reference/operators/context_load.md
section: "Docs"
---

# context_load

> Loads context state.

Loads context state.

```tql
context_load name:string
```

## Description

The `context_load` operator replaces the state of the specified context with its (binary) input.

### `name: string`

The name of the context whose state to update.

## Examples

### Replace the database of a GeoIP context

```tql
from_file "ultra-high-res.mmdb", mmap=true
context_load "ctx"
```

## See Also

* [`context_create_bloom_filter`](https://tenzir.com/docs/reference/operators/context_create_bloom_filter.md)
* [`context_create_geoip`](https://tenzir.com/docs/reference/operators/context_create_geoip.md)
* [`context_create_lookup_table`](https://tenzir.com/docs/reference/operators/context_create_lookup_table.md)
* [`context_enrich`](https://tenzir.com/docs/reference/operators/context_enrich.md)
* [`context_erase`](https://tenzir.com/docs/reference/operators/context_erase.md)
* [`context_inspect`](https://tenzir.com/docs/reference/operators/context_inspect.md)
* [`context_list`](https://tenzir.com/docs/reference/operators/context_list.md)
* [`context_remove`](https://tenzir.com/docs/reference/operators/context_remove.md)
* [`context_reset`](https://tenzir.com/docs/reference/operators/context_reset.md)
* [`context_save`](https://tenzir.com/docs/reference/operators/context_save.md)
* [`context_update`](https://tenzir.com/docs/reference/operators/context_update.md)
* [Use lookup tables](../../guides/enrich/use-lookup-tables.md)
