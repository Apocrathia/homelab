---
title: "context_enrich"
canonical: https://tenzir.com/docs/reference/operators/context_enrich
source: https://tenzir.com/docs/reference/operators/context_enrich.md
section: "Docs"
---

# context_enrich

> Enriches events with data from a context.

Enriches events with data from a context.

```tql
context_enrich name:string, key=any,
               [into=field, mode=string, format=string]
```

## Description

The `context_enrich` operator enriches events with data from a context.

### `name: string`

The name of the context to enrich with.

### `key = any`

The field to use for the context lookup.

### `into = field (optional)`

The field into which to write the enrichment.

Defaults to the context name (`name`).

### `mode = string (optional)`

The mode of the enrichment operation:

* `set`: overwrites the field specified by `into`.
* `append`: appends into the list specified by `into`. If `into` is `null` or an `empty` list, a new list is created. If `into` is not a list, the enrichment will fail with a warning.

Defaults to `set`.

### `format = string (optional)`

The style of the enriched value:

* `plain`: formats the enrichment as retrieved from the context.
* `ocsf`: formats the enrichment as an [OCSF Enrichment](https://schema.ocsf.io/1.4.0-dev/objects/enrichment?extensions=) object with fields `created_time`, `data`, `name`, `provider`, and `value`.

Defaults to `plain`.

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), multiple instances of `context_enrich` issue lookups concurrently. Every lookup is an atomic read from the shared context. Context updates can take effect between lookups, as they can with a single instance.

## Examples

### Enrich with a lookup table

Create a lookup table:

```tql
context_create_lookup_table "ctx"
```

Add data to the lookup table:

```tql
from {x:1, y:"a"},
     {x:2, y:"b"}
context_update "ctx", key=x, value=y
```

Enrich with the table:

```tql
from {x:1}
context_enrich "ctx", key=x
```

```tql
{
  x: 1,
  ctx: "a",
}
```

### Enrich as OCSF Enrichment

Assume the same table preparation as above, but followed by a different call to `context_enrich` using the `format` option:

```tql
from {x:1}
context_enrich "ctx", key=x, format="ocsf"
```

```tql
{
  x: 1,
  ctx: {
    created_time: 2024-11-18T16:35:48.069981,
    data: "a",
    name: "x",
    provider: "ctx",
    value: 1,
  }
}
```

### Enrich by appending to an array

Enrich twice with the same context and accumulate enrichments into an array:

```tql
from {x:1}
context_enrich "ctx", key=x, into=enrichments, mode="append"
context_enrich "ctx", key=x, into=enrichments, mode="append"
```

```tql
{
  x: 1,
  enrichments: [
    "a",
    "a",
  ]
}
```

## See Also

* [`context_create_bloom_filter`](https://tenzir.com/docs/reference/operators/context_create_bloom_filter.md)
* [`context_create_geoip`](https://tenzir.com/docs/reference/operators/context_create_geoip.md)
* [`context_create_lookup_table`](https://tenzir.com/docs/reference/operators/context_create_lookup_table.md)
* [`context_erase`](https://tenzir.com/docs/reference/operators/context_erase.md)
* [`context_inspect`](https://tenzir.com/docs/reference/operators/context_inspect.md)
* [`context_list`](https://tenzir.com/docs/reference/operators/context_list.md)
* [`context_load`](https://tenzir.com/docs/reference/operators/context_load.md)
* [`context_remove`](https://tenzir.com/docs/reference/operators/context_remove.md)
* [`context_reset`](https://tenzir.com/docs/reference/operators/context_reset.md)
* [`context_save`](https://tenzir.com/docs/reference/operators/context_save.md)
* [`context_update`](https://tenzir.com/docs/reference/operators/context_update.md)
* [Use lookup tables](../../guides/enrich/use-lookup-tables.md)
* [Enrich with threat intel](../../guides/enrich/enrich-with-threat-intel.md)
* [Enrich with asset inventory](../../guides/enrich/enrich-with-asset-inventory.md)
* [Learn idiomatic TQL](../../tutorials/learn-idiomatic-tql.md)
* [Enrichment](../../explanations/enrichment.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
