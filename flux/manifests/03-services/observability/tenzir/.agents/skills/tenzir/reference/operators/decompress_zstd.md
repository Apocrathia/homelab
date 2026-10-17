---
title: "decompress_zstd"
canonical: https://tenzir.com/docs/reference/operators/decompress_zstd
source: https://tenzir.com/docs/reference/operators/decompress_zstd.md
section: "Docs"
---

# decompress_zstd

> Decompresses a stream of bytes in the Zstd format.

Decompresses a stream of bytes in the Zstd format.

```tql
decompress_zstd
```

## Description

The `decompress_zstd` operator decompresses bytes in a pipeline incrementally. The operator supports decompressing multiple concatenated streams of the same codec transparently.

## Examples

### Import Suricata events from a Zstd-compressed file

```tql
from_file "eve.json.zstd" {
  decompress_zstd
  read_suricata
}
import
```

## See Also

* [`compress_zstd`](https://tenzir.com/docs/reference/operators/compress_zstd.md)
* [`decompress_brotli`](https://tenzir.com/docs/reference/operators/decompress_brotli.md)
* [`decompress_bz2`](https://tenzir.com/docs/reference/operators/decompress_bz2.md)
* [`decompress_gzip`](https://tenzir.com/docs/reference/operators/decompress_gzip.md)
* [`decompress_lz4`](https://tenzir.com/docs/reference/operators/decompress_lz4.md)
