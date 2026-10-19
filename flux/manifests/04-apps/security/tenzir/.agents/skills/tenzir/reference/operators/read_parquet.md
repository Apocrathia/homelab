---
title: "read_parquet"
canonical: https://tenzir.com/docs/reference/operators/read_parquet
source: https://tenzir.com/docs/reference/operators/read_parquet.md
section: "Docs"
---

# read_parquet

> Reads events from a Parquet byte stream.

Reads events from a Parquet byte stream.

```tql
read_parquet
```

## Description

Reads events from a [Parquet](https://parquet.apache.org/) byte stream.

[Apache Parquet](https://parquet.apache.org/) is a columnar storage format that a variety of data tools support.

Limitation

Tenzir currently assumes that all Parquet files use metadata recognized by Tenzir. We plan to lift this restriction in the future.

## Optimizations

The operator acts on the hints that the [optimizer](../../explanations/pipeline.md#optimization) pushes toward it:

* [`where`](https://tenzir.com/docs/reference/operators/where.md) predicates are evaluated as each row group decodes. Row groups whose statistics show that no row can match are skipped entirely. This works best for comparisons of a sorted or clustered field, such as a timestamp, with a constant.
* [`select`](https://tenzir.com/docs/reference/operators/select.md) narrows the decoded columns to the fields the pipeline reads, including fields that only the filter references. Selecting a field of a record decodes only that field. Fields inside lists and maps, and values such as subnets, are decoded whole.
* [`head`](https://tenzir.com/docs/reference/operators/head.md) stops decoding once enough events pass the filter.

The `where`, `select`, and `head` operators stay in the pipeline, so the result is the same whether or not the reader acts on the hints. A filter that calls a function conservatively keeps all columns.

When `read_parquet` heads the subpipeline of [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md), [`from_s3`](https://tenzir.com/docs/reference/operators/from_s3.md), [`from_google_cloud_storage`](https://tenzir.com/docs/reference/operators/from_google_cloud_storage.md), or [`from_azure_blob_storage`](https://tenzir.com/docs/reference/operators/from_azure_blob_storage.md), the hints also decide what gets fetched. The operator reads the file’s footer first and then only the column chunks of the selected columns, one row group at a time, stopping when the limit is met. On object stores, each fetch is a range request. For example,

```tql
from_s3 "s3://logs/2026/events.parquet" {
  read_parquet
}
select timestamp, message
head 100
```

downloads the footer and then the `timestamp` and `message` column chunks of one row group after another until it has 100 events, instead of the entire object. With typical row group sizes of tens of thousands of rows, that is a single row group.

The scan is a stream: the operator fetches the next row group while it decodes the current one and releases each row group once it is decoded. Memory use is therefore bounded by the size of two row groups, not by the size of the file, so a full read of a file larger than the available memory works.

Behind a source that cannot seek, such as [`from_tcp`](https://tenzir.com/docs/reference/operators/from_tcp.md), standard input, or a [`decompress_gzip`](https://tenzir.com/docs/reference/operators/decompress_gzip.md) in front of the reader, the operator buffers the whole byte stream before decoding, because Parquet keeps its metadata at the end of the file. Pipelines with checkpointing enabled also use this mode.

## Examples

Read a Parquet file:

```tql
from_file "/tmp/data.prq" {
  read_parquet
}
```

Read two fields of the first 100 events from a Parquet file on S3:

```tql
from_s3 "s3://logs/2026/events.parquet" {
  read_parquet
}
select timestamp, message
head 100
```

## See Also

* [`read_feather`](https://tenzir.com/docs/reference/operators/read_feather.md)
* [`write_parquet`](https://tenzir.com/docs/reference/operators/write_parquet.md)
