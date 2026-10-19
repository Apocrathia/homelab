---
title: "decompress_lz4"
canonical: https://tenzir.com/docs/reference/operators/decompress_lz4
source: https://tenzir.com/docs/reference/operators/decompress_lz4.md
section: "Docs"
---

# decompress_lz4

> Decompresses a stream of bytes in the Lz4 format.

Decompresses a stream of bytes in the Lz4 format.

```tql
decompress_lz4
```

## Description

The `decompress_lz4` operator decompresses bytes in a pipeline incrementally. The operator supports decompressing multiple concatenated streams of the same codec transparently.

## Examples

### Import Suricata events from a LZ4-compressed file

```tql
from_file "eve.json.lz4" {
  decompress_lz4
  read_suricata
}
import
```

## See Also

* [`compress_lz4`](https://tenzir.com/docs/reference/operators/compress_lz4.md)
* [`decompress_brotli`](https://tenzir.com/docs/reference/operators/decompress_brotli.md)
* [`decompress_bz2`](https://tenzir.com/docs/reference/operators/decompress_bz2.md)
* [`decompress_gzip`](https://tenzir.com/docs/reference/operators/decompress_gzip.md)
* [`decompress_zstd`](https://tenzir.com/docs/reference/operators/decompress_zstd.md)
