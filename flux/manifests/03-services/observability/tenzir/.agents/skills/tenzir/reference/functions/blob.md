---
title: "blob"
canonical: https://tenzir.com/docs/reference/functions/blob
source: https://tenzir.com/docs/reference/functions/blob.md
section: "Docs"
---

# blob

> Converts a UTF-8 string to a blob without encoding it first.

Converts a UTF-8 string to a blob without encoding it first.

```tql
blob(x: string|blob) -> blob
```

## Description

The `blob` function converts a string to a blob. It preserves the input bytes and returns blobs unchanged.

### `x: string|blob`

The string or blob to convert.

## Examples

### Store serialized fields as a blob

```tql
from {extra_data: {vendor_field: "value"}}
extra_data = extra_data.print_ndjson().blob()
```

Use this when you want to retain serialized data without indexing it as a string.

## See Also

* [`string`](https://tenzir.com/docs/reference/functions/string.md)
* [`print_ndjson`](https://tenzir.com/docs/reference/functions/print_ndjson.md)
* [Transform values](../../guides/shape/transform-values.md)
