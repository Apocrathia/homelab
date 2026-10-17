---
title: "context_create_bloom_filter"
canonical: https://tenzir.com/docs/reference/operators/context_create_bloom_filter
source: https://tenzir.com/docs/reference/operators/context_create_bloom_filter.md
section: "Docs"
---

# context_create_bloom_filter

> Creates a Bloom filter context.

Creates a Bloom filter context.

```tql
context_create_bloom_filter name:string, capacity=int, fp_probability=float
```

## Description

The `context_create_bloom_filter` operator constructs a new context of type [Bloom filter](../../explanations/enrichment.md#bloom-filter).

To find suitable values for the capacity and false-positive probability, consult Thomas Hurst’s [Bloom Filter Calculator](https://hur.st/bloomfilter/). The parameter `n` corresponds to `capacity` and `p` to `fp_probability`.

You can also create a Bloom filter context as code by adding it to `tenzir.contexts` in your `tenzir.yaml`:

\<prefix>/etc/tenzir/tenzir.yaml

```yaml
tenzir:
  contexts:
    my-iocs:
      type: bloom-filter
      arguments:
        capacity: 1B
        fp-probability: 0.001
```

Making changes to `arguments` of an already created context has no effect.

### `name: string`

The name of the new Bloom filter.

### `capacity = uint`

The maximum number of items in the filter that maintain the false positive probability. Adding more elements does not yield an error, but lookups will more likely return false positives.

### `fp_probability = float`

The false-positive probability of the Bloom filter.

## Examples

### Create a new Bloom filter context

```tql
context_create_bloom_filter "ctx", capacity=1B, fp_probability=0.001
```

## See Also

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
* [`context_update`](https://tenzir.com/docs/reference/operators/context_update.md)
* [Enrichment](../../explanations/enrichment.md)
