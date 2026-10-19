---
title: "write_parquet"
canonical: https://tenzir.com/docs/reference/operators/write_parquet
source: https://tenzir.com/docs/reference/operators/write_parquet.md
section: "Docs"
---

# write_parquet

> Transforms event stream to a Parquet byte stream.

Transforms event stream to a Parquet byte stream.

```tql
write_parquet [compression_level=int, compression_type=str]
```

## Description

[Apache Parquet](https://parquet.apache.org/) is a columnar storage format that a variety of data tools support.

### `compression_level = int (optional)`

An optional compression level for the corresponding compression type. This option is ignored if no compression type is specified.

Defaults to the compression type’s default compression level.

### `compression_type = str (optional)`

Specifies an optional compression type. Supported options are `zstd` for [Zstandard](http://facebook.github.io/zstd/) compression, `brotli` for [brotli](https://www.brotli.org) compression, `gzip` for [gzip](https://www.gzip.org) compression, and `snappy` for [snappy](https://google.github.io/snappy/) compression.

Why would I use this over the `compress_*` operators?

The Parquet format offers more efficient compression compared to the `compress_*` operators. This is because it compresses the data column-by-column, leaving metadata that needs to be accessed frequently uncompressed.

## Examples

Write a Parquet file:

```tql
from_file "/tmp/data.json" {
  read_json
}
write_parquet
```

## See Also

* [`read_bitz`](https://tenzir.com/docs/reference/operators/read_bitz.md)
* [`read_parquet`](https://tenzir.com/docs/reference/operators/read_parquet.md)
* [`write_bitz`](https://tenzir.com/docs/reference/operators/write_bitz.md)
* [`write_feather`](https://tenzir.com/docs/reference/operators/write_feather.md)
