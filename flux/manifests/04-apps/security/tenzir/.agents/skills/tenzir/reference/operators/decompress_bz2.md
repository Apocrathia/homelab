---
title: "decompress_bz2"
canonical: https://tenzir.com/docs/reference/operators/decompress_bz2
source: https://tenzir.com/docs/reference/operators/decompress_bz2.md
section: "Docs"
---

# decompress_bz2

> Decompresses a stream of bytes in the Bzip2 format.

Decompresses a stream of bytes in the Bzip2 format.

```tql
decompress_bz2
```

## Description

The `decompress_bz2` operator decompresses bytes in a pipeline incrementally. The operator supports decompressing multiple concatenated streams of the same codec transparently.

## Examples

### Import Suricata events from a Bzip2-compressed file

```tql
from_file "eve.json.bz" {
  decompress_bz2
  read_suricata
}
import
```

## See Also

* [`compress_bz2`](https://tenzir.com/docs/reference/operators/compress_bz2.md)
* [`decompress_brotli`](https://tenzir.com/docs/reference/operators/decompress_brotli.md)
* [`decompress_gzip`](https://tenzir.com/docs/reference/operators/decompress_gzip.md)
* [`decompress_lz4`](https://tenzir.com/docs/reference/operators/decompress_lz4.md)
* [`decompress_zstd`](https://tenzir.com/docs/reference/operators/decompress_zstd.md)
