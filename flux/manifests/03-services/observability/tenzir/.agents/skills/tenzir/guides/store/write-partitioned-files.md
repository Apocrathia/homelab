---
title: "Write partitioned files"
canonical: https://tenzir.com/docs/guides/store/write-partitioned-files
source: https://tenzir.com/docs/guides/store/write-partitioned-files.md
section: "Docs"
---

# Write partitioned files

> Partitioned files organize an event stream into separate files or objects based on field values. You can combine partitioning with size-based and time-based rotation to control the physical layout of data on a filesystem or object store.

Partitioned files organize an event stream into separate files or objects based on field values. You can combine partitioning with size-based and time-based rotation to control the physical layout of data on a filesystem or object store.

## Partition events

Use [`to_file`](https://tenzir.com/docs/reference/operators/to_file.md) for a local filesystem or [`to_s3`](https://tenzir.com/docs/reference/operators/to_s3.md) for Amazon S3. Place `**` in the output path where the operator should insert Hive-style partition directories, and list the partition fields in `partition_by`:

```tql
from {region: "us", message: "login"},
     {region: "eu", message: "scan"},
     {region: "us", message: "logout"}
to_file "/tmp/events/**/events_{uuid}.parquet",
  partition_by=[region] {
  write_parquet compression_type="zstd"
}
```

This pipeline writes files under paths such as:

```text
/tmp/events/region=us/events_<uuid>.parquet
/tmp/events/region=eu/events_<uuid>.parquet
```

The operator removes the partition fields before it sends events to the writer subpipeline. The partition values remain available in the path, but not in the serialized records.

The `{uuid}` placeholder expands to a new UUIDv7 for each file. Include it when partitioning or rotating files so a new file does not overwrite an earlier one.

## Derive partition fields

`partition_by` accepts field selectors. Derive a field upstream when the partition value requires a transformation. For example, derive an Amazon Security Lake-style day from an event timestamp:

```tql
eventDay = time.format_time("%Y%m%d")
to_s3 "s3://my-bucket/events/**/events_{uuid}.parquet",
  partition_by=[eventDay] {
  write_parquet compression_type="zstd"
}
```

The resulting object path contains `eventDay=YYYYMMDD`, and `eventDay` does not appear as a column in the Parquet file.

## Rotate files

Set `max_size` to rotate after the writer subpipeline emits a given number of bytes. Set `timeout` to rotate after a file has remained open for a given duration:

```tql
eventDay = time.format_time("%Y%m%d")
to_s3 "s3://my-bucket/events/**/events_{uuid}.parquet",
  partition_by=[eventDay],
  max_size=256Mi,
  timeout=5min {
  write_parquet compression_type="zstd"
}
```

Each partition rotates independently. The operator checks `max_size` after it receives an output chunk from the writer, so the resulting file can exceed the threshold by that chunk and by final format metadata. Treat `max_size` as a rotation threshold, not a strict upper bound.

## Account for buffering operators

Size-based rotation depends on the writer subpipeline producing bytes while it receives events. A streaming pipeline such as `write_parquet` emits data as batches arrive, which lets the destination observe the growing file.

A blocking operator such as `sort` must consume its complete input before it emits any events:

```tql
to_s3 "s3://my-bucket/events/**/events_{uuid}.parquet",
  partition_by=[eventDay],
  max_size=256Mi,
  timeout=5min {
  sort time
  write_parquet compression_type="zstd"
}
```

In this pipeline, `sort` buffers all events for the open partition. The destination sees no bytes until `timeout`, the end of input, or a graceful stop closes the subpipeline. The complete sorted output then goes into the same file, so `max_size` cannot split it.

You can therefore combine partitioning with either of these properties:

* Streaming serialization and effective size-based rotation.
* Global ordering within each file and time-based rotation.

The current composition cannot guarantee both global ordering and a maximum file size. Reduce `timeout` to close sorted files more frequently, but remember that their size still depends on the incoming data rate.

## Choose between `partition_by` and `group`

Use `partition_by` when each key only needs a separate output path. The destination operator already creates a writer subpipeline for each partition and manages its rotation.

Use [`group`](https://tenzir.com/docs/reference/operators/group.md) when each key needs a complete keyed subpipeline, such as a different destination, independent stateful processing, or additional routing logic. For example, aggregate each tenant independently before writing one summary per tenant:

```tql
group tenant {
  summarize events=count(), bytes=sum(bytes)
  tenant = $group
  to_file f"/tmp/summaries/{$group}.json" {
    write_ndjson
  }
}
```

Here, each group owns an independent `summarize` instance. If you instead want to write the original events under `tenant=<value>` directories, use `partition_by=[tenant]`. Adding `group` solely to construct partitioned paths duplicates behavior that `to_file` and `to_s3` already provide.

## Use table-aware destinations

Partitioned Parquet files are not automatically a table. Use [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md) when readers need an Apache Iceberg table with hidden partition transforms, schema evolution, manifests, snapshots, and atomic commits. Its `max_size`, `buffer_size`, and `timeout` parameters control a separate table-aware buffering and commit model.

Use [`to_amazon_security_lake`](https://tenzir.com/docs/reference/operators/to_amazon_security_lake.md) when writing OCSF events to [Amazon Security Lake](../../integrations/amazon/security-lake.md). It supplies the required S3 path, event-day partitioning, Parquet settings, ordering, and AWS role conventions. Because it sorts each file by `time`, its timeout closes files and their final size depends on the data accumulated during that interval.

## See also

* [`to_file`](https://tenzir.com/docs/reference/operators/to_file.md)
* [`to_s3`](https://tenzir.com/docs/reference/operators/to_s3.md)
* [`write_parquet`](https://tenzir.com/docs/reference/operators/write_parquet.md)
* [`group`](https://tenzir.com/docs/reference/operators/group.md)
* [`to_amazon_security_lake`](https://tenzir.com/docs/reference/operators/to_amazon_security_lake.md)
* [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md)
* [Amazon S3](../../integrations/amazon/s3.md)
* [Apache Iceberg](../../integrations/iceberg.md)
