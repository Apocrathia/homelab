---
title: "context_erase"
canonical: https://tenzir.com/docs/reference/operators/context_erase
source: https://tenzir.com/docs/reference/operators/context_erase.md
section: "Docs"
---

# context_erase

> Removes entries from a context.

Removes entries from a context.

```tql
context_erase name:string, key=any
```

## Description

The `context_erase` operator removes data from a context.

Use the `key` argument to specify the field in the input that should be deleted from the context.

### `name: string`

The name of the context to remove entries from.

### `key = any`

The field that represents the enrichment key in the data.

## Examples

### Delete entries from a context

```plaintext
from {network: 10.0.0.1/16}
context_erase "network-classification", key=network
```

## See Also

* [`context_create_bloom_filter`](https://tenzir.com/docs/reference/operators/context_create_bloom_filter.md)
* [`context_create_geoip`](https://tenzir.com/docs/reference/operators/context_create_geoip.md)
* [`context_create_lookup_table`](https://tenzir.com/docs/reference/operators/context_create_lookup_table.md)
* [`context_enrich`](https://tenzir.com/docs/reference/operators/context_enrich.md)
* [`context_inspect`](https://tenzir.com/docs/reference/operators/context_inspect.md)
* [`context_list`](https://tenzir.com/docs/reference/operators/context_list.md)
* [`context_load`](https://tenzir.com/docs/reference/operators/context_load.md)
* [`context_remove`](https://tenzir.com/docs/reference/operators/context_remove.md)
* [`context_reset`](https://tenzir.com/docs/reference/operators/context_reset.md)
* [`context_save`](https://tenzir.com/docs/reference/operators/context_save.md)
* [`context_update`](https://tenzir.com/docs/reference/operators/context_update.md)
* [Use lookup tables](../../guides/enrich/use-lookup-tables.md)
