---
title: "compress_zstd"
canonical: https://tenzir.com/docs/reference/operators/compress_zstd
source: https://tenzir.com/docs/reference/operators/compress_zstd.md
section: "Docs"
---

# compress_zstd

> Compresses a stream of bytes using zstd compression.

Compresses a stream of bytes using zstd compression.

```tql
compress_zstd [level=int]
```

## Description

The `compress_zstd` operator compresses bytes in a pipeline incrementally.

### `level = int (optional)`

The compression level to use. The supported values depend on the codec used. If omitted, the default level for the codec is used.

## Examples

### Export all events in a Zstd-compressed NDJSON file

```tql
export
to_file "/tmp/backup.json.zstd" {
  write_ndjson
  compress_zstd
}
```

### Read and write Zstd-compressed NDJSON

```tql
from_file "in.zstd" {
  decompress_zstd
  read_ndjson
}
to_file "out.zstd" {
  write_ndjson
  compress_zstd level=18
}
```

## See Also

* [`compress_brotli`](https://tenzir.com/docs/reference/operators/compress_brotli.md)
* [`compress_bz2`](https://tenzir.com/docs/reference/operators/compress_bz2.md)
* [`compress_gzip`](https://tenzir.com/docs/reference/operators/compress_gzip.md)
* [`compress_lz4`](https://tenzir.com/docs/reference/operators/compress_lz4.md)
* [`decompress_zstd`](https://tenzir.com/docs/reference/operators/decompress_zstd.md)
