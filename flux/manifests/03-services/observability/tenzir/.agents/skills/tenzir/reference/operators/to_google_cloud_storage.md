---
title: "to_google_cloud_storage"
canonical: https://tenzir.com/docs/reference/operators/to_google_cloud_storage
source: https://tenzir.com/docs/reference/operators/to_google_cloud_storage.md
section: "Docs"
---

# to_google_cloud_storage

> Writes events to one or multiple objects in Google Cloud Storage.

Writes events to one or multiple objects in Google Cloud Storage.

```tql
to_google_cloud_storage url:string, [anonymous=bool, max_size=int,
                        timeout=duration, partition_by=list<field>] { … }
```

## Description

The `to_google_cloud_storage` operator writes events to Google Cloud Storage, automatically opening new objects when a rotation condition triggers. It supports hive-style partitioning through a `**` placeholder in the URL and per-partition unique object names through a `{uuid}` placeholder.

By default, authentication is handled by Google’s Application Default Credentials (ADC) chain, which may read from multiple sources:

* `GOOGLE_APPLICATION_CREDENTIALS` environment variable pointing to a service account key file
* User credentials from `gcloud auth application-default login`
* Service account attached to the compute instance (Compute Engine, GKE)
* Google Cloud SDK credentials

### `url: string`

URL identifying the Google Cloud Storage location where data should be written.

The syntax is `gs://<bucket-name>/<full-path-to-object>(?<options>)`. The `<options>` are query parameters. Per the [Arrow documentation](https://arrow.apache.org/docs/r/articles/fs.html#connecting-directly-with-a-uri), the following options exist:

> For GCS, the supported parameters are `scheme`, `endpoint_override`, and `retry_limit_seconds`.

The path portion may contain two placeholders:

* `**` marks the location where hive partition segments are inserted. When present, `partition_by` must also be set, and vice versa.
* `{uuid}` expands to a fresh UUIDv7 for every object. This is required when partitioning or when rotation can produce multiple objects, so that rotated or per-partition objects do not overwrite each other.

### `anonymous = bool (optional)`

Use anonymous credentials instead of any configured authentication. This only works for publicly writable buckets.

Defaults to `false`.

### `max_size = int (optional)`

Rotates to a new file after the writer subpipeline emits at least this many bytes. The operator checks the size after each emitted chunk, so the resulting file can exceed `max_size` by that chunk and by final format metadata.

Size-based rotation requires the writer subpipeline to emit bytes while it receives events. A blocking operator such as `sort` buffers its complete input, so `max_size` cannot split its output. In that case, `timeout`, the end of input, or a graceful stop closes the file.

Defaults to `100M`.

### `timeout = duration (optional)`

Rotates to a new file after the current file has been open for this duration. Rotation is measured from the time the file was first opened.

Defaults to `5min`.

### `partition_by = list<field> (optional)`

A list of fields used to partition events into separate files. For every distinct combination of partition-field values, a separate file (or group of rotated files) is written. The URL must contain a `**` placeholder, which is replaced by the hive-style path `field1=value1/field2=value2/…`.

The operator removes the partition fields before it sends events to the writer subpipeline. Their values remain available in the generated path, but not in the serialized records.

### `{ … }`

Pipeline that transforms the incoming events into the byte stream that is written to each file. The pipeline must return bytes, so it must end with a writer such as `write_ndjson`, `write_parquet`, or `write_csv`, optionally followed by a compressor such as `compress_gzip`.

The subpipeline runs once per output file. When rotation or partitioning produces a new file, a new instance of the subpipeline is spawned for it.

## Examples

### Write a single NDJSON object

```tql
to_google_cloud_storage "gs://my-bucket/events/out_{uuid}.json" {
  write_ndjson
}
```

### Partition events into Parquet objects by date

```tql
to_google_cloud_storage "gs://my-bucket/events/**/data_{uuid}.parquet",
  partition_by=[year, month] {
  write_parquet
}
```

### Rotate to a new object every 100 MB

```tql
to_google_cloud_storage "gs://my-bucket/logs/events_{uuid}.json.gz",
  max_size=100M {
  write_ndjson
  compress_gzip
}
```

## See Also

* [`from_google_cloud_storage`](https://tenzir.com/docs/reference/operators/from_google_cloud_storage.md)
* [`to_google_cloud_storage`](https://tenzir.com/docs/reference/operators/to_google_cloud_storage.md)
* [`to_file`](https://tenzir.com/docs/reference/operators/to_file.md)
* [Google Cloud Storage](../../integrations/google/cloud-storage.md)
