---
title: "decompress_brotli"
canonical: https://tenzir.com/docs/reference/operators/decompress_brotli
source: https://tenzir.com/docs/reference/operators/decompress_brotli.md
section: "Docs"
---

# decompress_brotli

> Decompresses a stream of bytes in the Brotli format.

Decompresses a stream of bytes in the Brotli format.

```tql
decompress_brotli
```

## Description

The `decompress_brotli` operator decompresses bytes in a pipeline incrementally. The operator supports decompressing multiple concatenated streams of the same codec transparently.

## Examples

### Import Suricata events from a Brotli-compressed file

```tql
from_file "eve.json.brotli" {
  decompress_brotli
  read_suricata
}
import
```

## See Also

* [`compress_brotli`](https://tenzir.com/docs/reference/operators/compress_brotli.md)
* [`decompress_bz2`](https://tenzir.com/docs/reference/operators/decompress_bz2.md)
* [`decompress_gzip`](https://tenzir.com/docs/reference/operators/decompress_gzip.md)
* [`decompress_lz4`](https://tenzir.com/docs/reference/operators/decompress_lz4.md)
* [`decompress_zstd`](https://tenzir.com/docs/reference/operators/decompress_zstd.md)
