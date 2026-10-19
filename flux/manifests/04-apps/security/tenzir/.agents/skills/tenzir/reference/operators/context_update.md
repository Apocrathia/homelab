---
title: "context_update"
canonical: https://tenzir.com/docs/reference/operators/context_update
source: https://tenzir.com/docs/reference/operators/context_update.md
section: "Docs"
---

# context_update

> Updates a context with new data.

Updates a context with new data.

```tql
context_update name:string, key=any,
               [value=any, create_timeout=duration,
                write_timeout=duration, read_timeout=duration]
```

## Description

The `context_update` operator adds new data to a specified context.

Use the `key` argument to specify the field in the input that should be associated with the context. The [`context_enrich`](https://tenzir.com/docs/reference/operators/context_enrich.md) operator uses this key to access the context. For contexts that support assigning a value with a given key, you can provide an expression to customize what’s being associated with the given key.

The three arguments `create_timeout`, `write_timeout`, and `read_timeout` only work with lookup tables and set the respective timeouts per table entry.

### `name: string`

The name of the context to update.

### `key = any`

The field that represents the enrichment key in the data.

### `value = any (optional)`

The field that represents the enrichment value to associate with `key`.

Defaults to `this`.

### `create_timeout = duration (optional)`

Expires a context entry after a given duration since entry creation.

### `write_timeout = duration (optional)`

Expires a context entry after a given duration since the last update time. Every Every call to `context_update` resets the timeout for the respective key.

### `read_timeout = duration (optional)`

Expires a context entry after a given duration since the last access time. Every call to `context_enrich` resets the timeout for the respective key.

## Examples

### Populate a lookup table with data

Create a lookup table:

```tql
context_create_lookup_table "ctx"
```

Add data to the lookup table via `context_update`:

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

### Use a custom value as lookup table

```tql
from {x:1},
     {x:2}
context_update "ctx", key=x, value=x*x
```

```tql
{key: 2, value: 4}
{key: 1, value: 1}
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
* [`context_save`](https://tenzir.com/docs/reference/operators/context_save.md)
* [Use lookup tables](../../guides/enrich/use-lookup-tables.md)
* [Enrich with threat intel](../../guides/enrich/enrich-with-threat-intel.md)
* [Enrich with asset inventory](../../guides/enrich/enrich-with-asset-inventory.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
* [Enrichment](../../explanations/enrichment.md)
