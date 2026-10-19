---
title: "compress_lz4"
canonical: https://tenzir.com/docs/reference/operators/compress_lz4
source: https://tenzir.com/docs/reference/operators/compress_lz4.md
section: "Docs"
---

# compress_lz4

> Compresses a stream of bytes using lz4 compression.

Compresses a stream of bytes using lz4 compression.

```tql
compress_lz4 [level=int]
```

## Description

The `compress_lz4` operator compresses bytes in a pipeline incrementally.

### `level = int (optional)`

The compression level to use. The supported values depend on the codec used. If omitted, the default level for the codec is used.

## Examples

### Export all events in a Lz4-compressed NDJSON file

```tql
export
to_file "/tmp/backup.json.lz4" {
  write_ndjson
  compress_lz4
}
```

### Read and write LZ4-compressed NDJSON

```tql
from_file "in.lz4" {
  decompress_lz4
  read_ndjson
}
to_file "out.lz4" {
  write_ndjson
  compress_lz4 level=18
}
```

## See Also

* [`compress_brotli`](https://tenzir.com/docs/reference/operators/compress_brotli.md)
* [`compress_bz2`](https://tenzir.com/docs/reference/operators/compress_bz2.md)
* [`compress_gzip`](https://tenzir.com/docs/reference/operators/compress_gzip.md)
* [`compress_zstd`](https://tenzir.com/docs/reference/operators/compress_zstd.md)
* [`decompress_lz4`](https://tenzir.com/docs/reference/operators/decompress_lz4.md)
