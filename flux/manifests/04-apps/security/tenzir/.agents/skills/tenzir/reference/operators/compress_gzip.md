---
title: "compress_gzip"
canonical: https://tenzir.com/docs/reference/operators/compress_gzip
source: https://tenzir.com/docs/reference/operators/compress_gzip.md
section: "Docs"
---

# compress_gzip

> Compresses a stream of bytes using gzip compression.

Compresses a stream of bytes using gzip compression.

```tql
compress_gzip [level=int, window_bits=int, format=string]
```

## Description

The `compress_gzip` operator compresses bytes in a pipeline incrementally.

### `level = int (optional)`

The compression level to use. The supported values depend on the codec used. If omitted, the default level for the codec is used.

### `window_bits = int (optional)`

A number representing the encoder window bits.

### `format = string (optional)`

A string representing the used format. Possible values are `zlib`, `deflate` and `gzip`.

Defaults to `gzip`.

## Examples

### Export all events in a Gzip-compressed NDJSON file

```tql
export
to_file "/tmp/backup.json.gz" {
  write_ndjson
  compress_gzip
}
```

### Compress using Gzip deflate

```tql
export
write_ndjson
compress_gzip format="deflate"
```

### Read and write Gzip-compressed NDJSON

```tql
from_file "in.gzip" {
  decompress_gzip
  read_ndjson
}
to_file "out.gzip" {
  write_ndjson
  compress_gzip level=18
}
```

## See Also

* [`compress_brotli`](https://tenzir.com/docs/reference/operators/compress_brotli.md)
* [`compress_bz2`](https://tenzir.com/docs/reference/operators/compress_bz2.md)
* [`compress_lz4`](https://tenzir.com/docs/reference/operators/compress_lz4.md)
* [`compress_zstd`](https://tenzir.com/docs/reference/operators/compress_zstd.md)
* [`decompress_gzip`](https://tenzir.com/docs/reference/operators/decompress_gzip.md)
