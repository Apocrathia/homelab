---
title: "compress_brotli"
canonical: https://tenzir.com/docs/reference/operators/compress_brotli
source: https://tenzir.com/docs/reference/operators/compress_brotli.md
section: "Docs"
---

# compress_brotli

> Compresses a stream of bytes using Brotli compression.

Compresses a stream of bytes using Brotli compression.

```tql
compress_brotli [level=int, window_bits=int]
```

## Description

The `compress_brotli` operator compresses bytes in a pipeline incrementally.

### `level = int (optional)`

The compression level to use. The supported values depend on the codec used. If omitted, the default level for the codec is used.

### `window_bits = int (optional)`

A number representing the encoder window bits.

## Examples

### Export all events in a Brotli-compressed NDJSON file

```tql
export
to_file "/tmp/backup.json.bt" {
  write_ndjson
  compress_brotli
}
```

### Read and write Brotli-compressed NDJSON

```tql
from_file "in.brotli" {
  decompress_brotli
  read_ndjson
}
to_file "out.brotli" {
  write_ndjson
  compress_brotli level=18
}
```

## See Also

* [`compress_bz2`](https://tenzir.com/docs/reference/operators/compress_bz2.md)
* [`compress_gzip`](https://tenzir.com/docs/reference/operators/compress_gzip.md)
* [`compress_lz4`](https://tenzir.com/docs/reference/operators/compress_lz4.md)
* [`compress_zstd`](https://tenzir.com/docs/reference/operators/compress_zstd.md)
* [`decompress_brotli`](https://tenzir.com/docs/reference/operators/decompress_brotli.md)
