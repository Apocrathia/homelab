---
title: "context_create_geoip"
canonical: https://tenzir.com/docs/reference/operators/context_create_geoip
source: https://tenzir.com/docs/reference/operators/context_create_geoip.md
section: "Docs"
---

# context_create_geoip

> Creates a GeoIP context.

Creates a GeoIP context.

```tql
context_create_geoip name:string, [db_path=string]
```

## Description

The `context_create_geoip` operator constructs a new context of type [GeoIP](../../explanations/enrichment.md#geoip-database).

You must either provide a database with the `db_path` argument or use [`context_load`](https://tenzir.com/docs/reference/operators/context_load.md) to populate the context after creation.

You can also create a GeoIP context as code by adding it to `tenzir.contexts` in your `tenzir.yaml`:

\<prefix>/etc/tenzir/tenzir.yaml

```yaml
tenzir:
  contexts:
    my-geoips:
      type: geoip
      arguments:
        db-path: /usr/local/share/stuff/high-res-geoips.mmdb
```

Making changes to `arguments` of an already created context has no effect.

### `name: string`

The name of the new GeoIP context.

### `db_path = string (optional)`

The path to the [MMDB](https://maxmind.github.io/MaxMind-DB/) database, relative to the node’s working directory.

## Examples

### Create a new GeoIP context

```tql
context_create_geoip "ctx", db_path="GeoLite2-City.mmdb"
```

### Populate a GeoIP context from a remote location

Load [CIRCL’s Geo Open](https://data.public.lu/en/datasets/geo-open-ip-address-geolocation-per-country-in-mmdb-format/) dataset from November 12, 2024:

```tql
from_http "https://data.public.lu/fr/datasets/r/69064b5d-bf46-4244-b752-2096b16917a4"
context_load "ctx"
```

## See Also

* [`context_create_bloom_filter`](https://tenzir.com/docs/reference/operators/context_create_bloom_filter.md)
* [`context_create_lookup_table`](https://tenzir.com/docs/reference/operators/context_create_lookup_table.md)
* [`context_enrich`](https://tenzir.com/docs/reference/operators/context_enrich.md)
* [`context_erase`](https://tenzir.com/docs/reference/operators/context_erase.md)
* [`context_inspect`](https://tenzir.com/docs/reference/operators/context_inspect.md)
* [`context_list`](https://tenzir.com/docs/reference/operators/context_list.md)
* [`context_load`](https://tenzir.com/docs/reference/operators/context_load.md)
* [`context_remove`](https://tenzir.com/docs/reference/operators/context_remove.md)
* [`context_reset`](https://tenzir.com/docs/reference/operators/context_reset.md)
* [`context_save`](https://tenzir.com/docs/reference/operators/context_save.md)
* [`context_update`](https://tenzir.com/docs/reference/operators/context_update.md)
